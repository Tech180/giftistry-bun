import type { ItemFieldRepository } from '../domain/ports/item-field.repository';
import type { FieldDefinition } from '../domain/item-field.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class GetFieldDefinitionsUseCase {
  constructor(private fieldRepo: ItemFieldRepository) {}

  async execute(category: string): Promise<FieldDefinition[]> {
    if (!category) {
      throw new AppError('Category is required', 400, 'BAD_REQUEST');
    }

    const definitions = await this.fieldRepo.findDefinitionsByCategory(category);
    if (definitions.length === 0) {
      return [];
    }

    const fieldIds = definitions.map(d => d.Id);
    const dependencies = await this.fieldRepo.findDependenciesByFieldIds(fieldIds);

    // Group dependencies by dependent_field_id
    const depMap = new Map<string, typeof dependencies>();
    for (const dep of dependencies) {
      if (!depMap.has(dep.DependentFieldId)) {
        depMap.set(dep.DependentFieldId, []);
      }
      depMap.get(dep.DependentFieldId)!.push(dep);
    }

    // Map dependencies back to definitions
    for (const def of definitions) {
      def.Dependencies = depMap.get(def.Id) || [];
    }

    return definitions;
  }
}
