import {
  Enum,
  File,
  Generator,
  getUnionByName,
  Interface,
  isRequired,
  MemberValue,
  Method,
  Parameter,
  Property,
  ReturnValue,
  Service,
  Type,
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
    if (method.returns) {
      yield '';
      yield `Returns: ${this.buildLinkedTypeName(method.returns)}${
        method.returns.value.isArray ? '[]' : ''
      }`;
    }
    if (method.description) {
      for (const line of method.description) {
        yield '';
        yield line.value;
      }
    }
    yield '';
  }

  private buildMethodDefinition(method: Method): string {
    const hasRequiredParams = !!method.parameters.find((p) =>
      isRequired(p.value),
    );

    const parameters = method.parameters.length
      ? `({${sortParameters(method.parameters)
          .map(
            (param) =>
              `${buildParameterName(param)}${
                isRequired(param.value) ? '' : '?'
              }`,
          )
          .join(', ')}}${hasRequiredParams ? '' : ' | undefined'})`
      : '';

    return `${buildMethodName(method)}${parameters}`;
  }

  private *buildParameter(param: Parameter): Iterable<string> {
    yield `- \`${buildParameterName(param)}\` ${this.buildLinkedTypeName(
      param,
    )}${
      isRequired(param.value) ? '' : ' (optional)'
    }${this.buildParameterDescription(param)}`;

    yield* this.buildRules(param.value.rules);
  }

  private *buildRules(rules: Iterable<ValidationRule>): Iterable<string> {
    for (const rule of rules) {
      switch (rule.id) {
        case 'ArrayMaxItems':
          yield `  - Max array length: \`${rule.max.value}\``;
          break;
        case 'ArrayMinItems':
          yield `  - Min array length: \`${rule.min.value}\``;
          break;
        case 'ArrayUniqueItems':
          yield `  - Values must be unique`;
          break;
        case 'NumberGT':
          yield `  - Must be greater than \`${rule.value.value}\``;
          break;
        case 'NumberGTE':
          yield `  - Must be greater than or equal to \`${rule.value.value}\``;
          break;
        case 'NumberLT':
          yield `  - Must be less than \`${rule.value.value}\``;
          break;
        case 'NumberLTE':
          yield `  - Must be less than or equal to \`${rule.value.value}\``;
          break;
        case 'NumberMultipleOf':
          yield `  - Must be a multiple of \`${rule.value.value}\``;
          break;
        case 'StringMaxLength':
          yield `  - Max length: \`${rule.length.value}\``;
          break;
        case 'StringMinLength':
          yield `  - Min length: \`${rule.length.value}\``;
          break;
        case 'StringPattern':
          yield `  - Must match pattern: \`${rule.pattern.value}\``;
          break;
      }
    }
  }

  private buildLinkedTypeName(
    param: Parameter | Property | ReturnValue | MemberValue,
  ): string {
    const memberValue = getMemberValue(param);
    const union = getUnionByName(this.service, memberValue.typeName.value);
    if (union) {
      const members = union.members
        .map((m: MemberValue) => this.buildLinkedTypeName(m))
        .join(' | ');

      return memberValue.isArray ? `(${members})[]` : members;
    }

    const typeName = this.buildTypeName(param, true);

    if (memberValue.kind === 'PrimitiveValue') {
      let uri: string | undefined = undefined;
      switch (memberValue.typeName.value) {
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
        return `[&lt;${typeName}${
          memberValue.isArray ? '[]' : ''
        }&gt;](${uri})`;
      } else {
        return `&lt;${typeName}${memberValue.isArray ? '[]' : ''}&gt;`;
      }
    } else {
      return `[&lt;${typeName}${memberValue.isArray ? '[]' : ''}&gt;](${anchor(
        typeName,
      )})`;
    }
  }

  private *buildInterfaceDescription(int: Interface): Iterable<string> {
    if (int.description) {
      if (int.description) {
        for (const para of int.description) {
          yield para.value;
          yield '';
        }
      }
    }
  }

  private buildParameterDescription(param: Parameter | Property): string {
    if (!param.description) return '';

    return ` - ${param.description.map((line) => line.value).join(' ')}`;
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
      yield `- Keys: ${this.buildLinkedTypeName(type.mapProperties.key.value)}`;
      yield `- Values: ${this.buildLinkedTypeName(
        type.mapProperties.value.value,
      )}`;
    }
    yield '';
  }

  private *buildProperty(prop: Property): Iterable<string> {
    yield `- \`${buildPropertyName(prop)}\` ${this.buildLinkedTypeName(prop)}${
      isRequired(prop.value) ? '' : ' (optional)'
    }${this.buildParameterDescription(prop)}`;

    yield* this.buildRules(prop.value.rules);
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
    if (e.members.length) {
      yield '';
      for (const member of e.members) {
        const valueDescription = valueDescriptions?.[member.content.value];
        yield `- \`${member.content.value}\`${
          valueDescription ? ` - ${valueDescription}` : ''
        }`;
      }
    }
    yield '';
  }

  private buildTypeName(
    type: Parameter | Property | ReturnValue | MemberValue,
    skipArrayify: boolean = false,
  ): string {
    const fullyQualifiedName = buildTypeName(getMemberValue(type));

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

function getMemberValue(
  node: Parameter | Property | ReturnValue | MemberValue,
): MemberValue {
  return node.kind === 'ComplexValue' || node.kind === 'PrimitiveValue'
    ? node
    : node.value;
}
