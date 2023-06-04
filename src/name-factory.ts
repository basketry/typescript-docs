import { Interface, Service } from 'basketry';
import { kebab } from 'case';

import { buildInterfaceName } from '@basketry/typescript/lib/name-factory';

import { NamespacedTypescriptOptions } from '@basketry/typescript/lib/types';

export function buildInterfaceDocsFilepath(
  int: Interface,
  service: Service,
  options?: NamespacedTypescriptOptions,
): string[] {
  return [
    `v${service.majorVersion.value}`,
    `${kebab(buildInterfaceName(int))}.md`,
  ];
}
