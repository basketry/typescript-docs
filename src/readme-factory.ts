import {
  Enum,
  File,
  Generator,
  getUnionByName,
  Interface,
  isRequired,
  Method,
  Parameter,
  Property,
  ReturnType,
  Service,
  Type,
  TypedValue,
  ValidationRule,
  warning,
} from 'basketry';
import { pascal, title } from 'case';

import { from } from '@basketry/typescript/lib/utils';

import { NamespacedTypescriptOptions } from '@basketry/typescript/lib/types';
import {
  buildInterfaceName,
  buildMethodName,
  buildParameterName,
  buildPropertyName,
  buildTypeName,
} from '@basketry/typescript/lib/name-factory';
import { buildInterfaceDocsFilepath } from './name-factory';
import { InterfaceInfo } from './interface-info';

export const generateDocs: Generator = (
  service,
  options?: NamespacedTypescriptOptions,
) => {
  return new Builder(service, options).build();
};

class Builder {
  constructor(
    private readonly service: Service,
    private readonly options?: NamespacedTypescriptOptions,
  ) {}

  build(): File[] {
    return this.service.interfaces.map((int) =>
      this.buildInterfaceDocsFile(int),
    );
  }

  private *warning(): Iterable<string> {
    yield '<!--';
    yield* warning(
      this.service,
      require('../package.json'),
      this.options || {},
    );
    yield '--->';
  }

  private methods(int: Interface): Method[] {
    return [...int.methods].sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
  }

  private types(int: Interface): Type[] {
    const interfaceInfo = new InterfaceInfo(this.service, int);
    return Array.from(interfaceInfo.types).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
  }

  private enums(int: Interface): Enum[] {
    const interfaceInfo = new InterfaceInfo(this.service, int);

    return Array.from(interfaceInfo.enums).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
  }

  private buildInterfaceDocsFile(int: Interface): File {
    return {
      path: buildInterfaceDocsFilepath(int, this.service, this.options),
      contents: from(this.buildInterfaceDocs(int)),
    };
  }

  private *buildInterfaceDocs(int: Interface): Iterable<string> {
    const methods = this.methods(int);
    const types = this.types(int);
    const enums = this.enums(int);

    yield* this.warning();
    yield '';
    yield `# ${title(buildInterfaceName(int))}`;
    yield '';
    yield* this.buildInterfaceDescription(int);
    yield* this.buildToc(int);
    yield '';

    if (methods.length) {
      yield '## Methods';
      yield '';
      for (const method of methods) {
        yield* this.buildMethodDocs(method);
      }
    }
    if (types.length) {
      yield '## Types';
      yield '';
      for (const type of types) {
        yield* this.buildTypeDocs(type);
      }
    }
    if (enums.length) {
      yield '## Enums';
      yield '';
      for (const e of enums) {
        yield* this.buildEnumDocs(e);
      }
    }
  }

  private *buildToc(int: Interface): Iterable<string> {
    const methods = this.methods(int);
    const types = this.types(int);
    const enums = this.enums(int);

    if (methods.length) {
      yield '- Methods';
      for (const method of methods) {
        yield `  - [${buildMethodName(method)}](${anchor(
          buildMethodName(method),
        )})`;
      }
    }
    if (types.length) {
      yield '- Types';
      for (const type of types) {
        yield `  - [${pascal(type.name.value)}](${anchor(type.name.value)})`;
      }
    }
    if (enums.length) {
      yield '- Enums';
      for (const e of enums) {
        yield `  - [${pascal(e.name.value)}](${anchor(e.name.value)})`;
      }
    }
  }

  private *buildMethodDocs(method: Method): Iterable<string> {
    yield `### ${buildMethodName(method)}`;
    yield '';
    yield `\`${this.buildMethodDefinition(method)}\``;
    if (method.parameters.length) {
      yield '';
      for (const param of sortParameters(method.parameters)) {
        yield* this.buildParameter(param);
      }
    }
    if (method.returnType) {
      yield '';
      yield `Returns: ${this.buildLinkedTypeName(method.returnType)}${
        method.returnType.isArray ? '[]' : ''
      }`;
    }
    if (Array.isArray(method.description)) {
      for (const line of method.description) {
        yield '';
        yield line.value;
      }
    } else if (method.description) {
      yield '';
      yield method.description.value;
    }
    yield '';
  }

  private buildMethodDefinition(method: Method): string {
    const hasRequiredParams = !!method.parameters.find(isRequired);

    const parameters = method.parameters.length
      ? `({${sortParameters(method.parameters)
          .map(
            (param) =>
              `${buildParameterName(param)}${isRequired(param) ? '' : '?'}`,
          )
          .join(', ')}}${hasRequiredParams ? '' : ' | undefined'})`
      : '';

    return `${buildMethodName(method)}${parameters}`;
  }

  private *buildParameter(param: Parameter): Iterable<string> {
    yield `- \`${buildParameterName(param)}\` ${this.buildLinkedTypeName(
      param,
    )}${isRequired(param) ? '' : ' (optional)'}${this.buildParameterDescription(
      param,
    )}`;

    yield* this.buildRules(param.rules);
  }

  private *buildRules(rules: Iterable<ValidationRule>): Iterable<string> {
    for (const rule of rules) {
      switch (rule.id) {
        case 'array-max-items':
          yield `  - Max array length: \`${rule.max.value}\``;
          break;
        case 'array-min-items':
          yield `  - Min array length: \`${rule.min.value}\``;
          break;
        case 'array-unique-items':
          yield `  - Values must be unique`;
          break;
        case 'number-gt':
          yield `  - Must be greater than \`${rule.value.value}\``;
          break;
        case 'number-gte':
          yield `  - Must be greater than or equal to \`${rule.value.value}\``;
          break;
        case 'number-lt':
          yield `  - Must be less than \`${rule.value.value}\``;
          break;
        case 'number-lte':
          yield `  - Must be less than or equal to \`${rule.value.value}\``;
          break;
        case 'number-multiple-of':
          yield `  - Must be a multiple of \`${rule.value.value}\``;
          break;
        case 'string-max-length':
          yield `  - Max length: \`${rule.length.value}\``;
          break;
        case 'string-min-length':
          yield `  - Min length: \`${rule.length.value}\``;
          break;
        case 'string-pattern':
          yield `  - Must match pattern: \`${rule.pattern.value}\``;
          break;
      }
    }
  }

  private buildLinkedTypeName(
    param: Parameter | Property | ReturnType | TypedValue,
  ): string {
    const union = getUnionByName(this.service, param.typeName.value);
    if (union) {
      const members = union.members
        .map((m: TypedValue) => this.buildLinkedTypeName(m))
        .join(' | ');

      return param.isArray ? `(${members})[]` : members;
    }

    const typeName = this.buildTypeName(param, true);

    if (param.isPrimitive) {
      let uri: string | undefined = undefined;
      switch (param.typeName.value) {
        case 'string':
          uri =
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type';
          break;
        case 'number':
        case 'integer':
        case 'long': // TODO: BigInt
        case 'float':
        case 'double':
          uri =
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type';
          break;
        case 'boolean':
          uri =
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type';
          break;
        case 'date':
        case 'date-time':
          uri =
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date';
          break;
        case 'null':
          uri =
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#null_type';
          break;
      }

      if (uri) {
        return `[&lt;${typeName}${param.isArray ? '[]' : ''}&gt;](${uri})`;
      } else {
        return `&lt;${typeName}${param.isArray ? '[]' : ''}&gt;`;
      }
    } else {
      return `[&lt;${typeName}${param.isArray ? '[]' : ''}&gt;](${anchor(
        typeName,
      )})`;
    }
  }

  private *buildInterfaceDescription(int: Interface): Iterable<string> {
    if (int.description) {
      if (Array.isArray(int.description)) {
        for (const para of int.description) {
          yield para.value;
          yield '';
        }
      } else {
        yield int.description.value;
        yield '';
      }
    }
  }

  private buildParameterDescription(param: Parameter | Property): string {
    if (!param.description) return '';

    if (Array.isArray(param.description)) {
      return ` - ${param.description.map((line) => line.value).join(' ')}`;
    }

    return ` - ${param.description.value}`;
  }

  private *buildTypeDocs(type: Type): Iterable<string> {
    yield `### ${pascal(type.name.value)}`;
    yield '';
    yield `\`${pascal(type.name.value)}\``;
    if (Array.isArray(type.description)) {
      for (const line of type.description) {
        yield '';
        yield line.value;
      }
    } else if (type.description) {
      yield '';
      yield type.description.value;
    }
    if (type.properties.length) {
      yield '';
      for (const prop of type.properties) {
        yield* this.buildProperty(prop);
      }
    }
    if (type.mapProperties) {
      yield '';
      yield `#### Map Properties`;
      yield '';
      yield `- Keys: ${this.buildLinkedTypeName(type.mapProperties.key)}`;
      yield `- Values: ${this.buildLinkedTypeName(type.mapProperties.value)}`;
    }
    yield '';
  }

  private *buildProperty(prop: Property): Iterable<string> {
    yield `- \`${buildPropertyName(prop)}\` ${this.buildLinkedTypeName(prop)}${
      isRequired(prop) ? '' : ' (optional)'
    }${this.buildParameterDescription(prop)}`;

    yield* this.buildRules(prop.rules);
  }

  private *buildEnumDocs(e: Enum): Iterable<string> {
    const description = e.meta?.find(
      (m) => m.key.value === 'codegen-enum-description',
    )?.value?.value;
    const valueDescriptions = e.meta?.find(
      (m) => m.key.value === 'codegen-enum-value-descriptions',
    )?.value?.value as Record<string, string> | undefined;
    yield `### ${pascal(e.name.value)}`;
    yield '';
    yield `\`${pascal(e.name.value)}\``;
    if (description) {
      yield '';
      yield description;
    }
    if (e.values.length) {
      yield '';
      for (const value of e.values) {
        const valueDescription = valueDescriptions?.[value.content.value];
        yield `- \`${value.content.value}\`${
          valueDescription ? ` - ${valueDescription}` : ''
        }`;
      }
    }
    yield '';
  }

  private buildTypeName(
    type: Parameter | Property | ReturnType | TypedValue,
    skipArrayify: boolean = false,
  ): string {
    const fullyQualifiedName = buildTypeName(type);

    if (fullyQualifiedName.endsWith('[]') && skipArrayify) {
      return fullyQualifiedName.substring(0, fullyQualifiedName.length - 2);
    } else {
      return fullyQualifiedName;
    }
  }
}

function sortParameters(parameters: Parameter[]): Parameter[] {
  return [...parameters].sort((a, b) =>
    a.name.value.localeCompare(b.name.value),
  );
}

function anchor(name: string): string {
  return `#${name.toLocaleLowerCase().split(' ').join('-')}`;
}
