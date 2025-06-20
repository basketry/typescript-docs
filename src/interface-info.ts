import {
  Enum,
  Interface,
  Service,
  Type,
  Union,
  getEnumByName,
  getTypeByName,
  getUnionByName,
} from 'basketry';

export class InterfaceInfo {
  constructor(
    private readonly service: Service,
    private readonly int: Interface,
  ) {
    this.init();
  }

  private readonly _inputEnums = new Map<string, Enum>();
  private readonly _outputEnums = new Map<string, Enum>();

  private readonly _inputTypes = new Map<string, Type>();
  private readonly _outputTypes = new Map<string, Type>();

  private readonly _inputUnions = new Map<string, Union>();
  private readonly _outputUnions = new Map<string, Union>();

  get types(): Iterable<Type> {
    const names = new Set<string>([
      ...this._inputTypes.keys(),
      ...this._outputTypes.keys(),
    ]);

    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map(
        (name) => this._inputTypes.get(name) ?? this._outputTypes.get(name)!,
      );
  }

  get inputTypes(): Iterable<Type> {
    return Array.from(this._inputTypes.values()).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
  }

  get outputTypes(): Iterable<Type> {
    return Array.from(this._outputTypes.values()).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
  }

  get unions(): Iterable<Union> {
    const names = new Set<string>([
      ...this._inputUnions.keys(),
      ...this._outputUnions.keys(),
    ]);

    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map(
        (name) => this._inputUnions.get(name) ?? this._outputUnions.get(name)!,
      );
  }

  get inputUnions(): Iterable<Union> {
    return Array.from(this._inputUnions.values()).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
  }

  get outputUnions(): Iterable<Union> {
    return Array.from(this._outputUnions.values()).sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
  }

  get enums(): Iterable<Enum> {
    const names = new Set<string>([
      ...this._inputEnums.keys(),
      ...this._outputEnums.keys(),
    ]);

    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map(
        (name) => this._inputEnums.get(name) ?? this._outputEnums.get(name)!,
      );
  }

  private init(): void {
    for (const method of this.int.methods) {
      for (const param of method.parameters) {
        for (const t of this.traverse(param.typeName.value, 'input')) {
          // noop
        }
      }

      if (method.returnType && !method.returnType.isPrimitive) {
        for (const t of this.traverse(
          method.returnType.typeName.value,
          'output',
        )) {
          // noop
        }
      }
    }
  }

  private *traverse(
    typeName: string,
    mode: 'input' | 'output',
  ): Iterable<Type> {
    if (mode === 'input' && this._inputTypes.has(typeName)) return;
    if (mode === 'output' && this._outputTypes.has(typeName)) return;
    if (mode === 'input' && this._inputUnions.has(typeName)) return;
    if (mode === 'output' && this._outputUnions.has(typeName)) return;
    if (mode === 'input' && this._inputEnums.has(typeName)) return;
    if (mode === 'output' && this._outputEnums.has(typeName)) return;

    const type = getTypeByName(this.service, typeName);
    const e = getEnumByName(this.service, typeName);
    const union = getUnionByName(this.service, typeName);

    if (type) {
      if (mode === 'input') {
        this._inputTypes.set(typeName, type);
      } else {
        this._outputTypes.set(typeName, type);
      }
      yield type;

      for (const prop of type.properties) {
        if (!prop.isPrimitive) {
          yield* this.traverse(prop.typeName.value, mode);
        }
      }
    } else if (union) {
      if (mode === 'input') {
        this._inputUnions.set(typeName, union);
      } else {
        this._outputUnions.set(typeName, union);
      }
      for (const member of union.members) {
        yield* this.traverse(member.typeName.value, mode);
      }
    } else if (e) {
      if (mode === 'input') {
        this._inputEnums.set(typeName, e);
      } else {
        this._outputEnums.set(typeName, e);
      }
    }
  }
}
