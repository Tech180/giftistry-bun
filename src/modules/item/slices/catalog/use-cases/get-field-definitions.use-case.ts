import type { ItemFieldRepository } from '../../../domain/ports/item-field.repository';
import type { FieldDefinition } from '../../../domain/interfaces/field-definition.interface';
import type { ServerConfigRepository } from '@/modules/system';
import {
  catalogForConfig,
  collectEnabledPackFieldsForCategory,
  sanitizeEnabledPackIdsForConfig,
} from '@/modules/system';
import { AppError } from '@/common/domain/errors/app-error';

export class GetFieldDefinitionsUseCase {
  constructor(
    private fieldRepo: ItemFieldRepository,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(category: string): Promise<FieldDefinition[]> {
    if (!category) {
      throw new AppError('Category is required', 400, 'BAD_REQUEST');
    }

    const definitions = [...(await this.fieldRepo.findDefinitionsByCategory(category))];

    if (definitions.length > 0) {
      const fieldIds = definitions.map((d) => d.Id);
      const dependencies = await this.fieldRepo.findDependenciesByFieldIds(fieldIds);

      const depMap = new Map<string, typeof dependencies>();
      for (const dep of dependencies) {
        if (!depMap.has(dep.DependentFieldId)) {
          depMap.set(dep.DependentFieldId, []);
        }
        depMap.get(dep.DependentFieldId)!.push(dep);
      }

      for (const def of definitions) {
        def.Dependencies = depMap.get(def.Id) || [];
      }
    }

    const config = this.serverConfigRepo.load();
    const catalog = catalogForConfig(config);
    const enabledPackIds = sanitizeEnabledPackIdsForConfig(config);
    const existingKeys = new Set(definitions.map((def) => def.FieldKey));
    let displayOrder = definitions.reduce(
      (max, def) => Math.max(max, def.DisplayOrder),
      0
    );

    const packFields = collectEnabledPackFieldsForCategory({
      enabledPackIds,
      category,
      catalog,
    });

    for (const { packId, field } of packFields) {
      if (existingKeys.has(field.key)) continue;
      existingKeys.add(field.key);
      displayOrder += 1;
      definitions.push({
        Id: `pack:${packId}:${field.key}`,
        Category: category,
        FieldKey: field.key,
        Label: field.label,
        Placeholder: field.hint ?? null,
        DisplayOrder: displayOrder,
        Dependencies: [],
      });
    }

    return definitions;
  }
}
