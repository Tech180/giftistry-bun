import { describe, expect, it } from 'bun:test';
import { canViewerSeeSubstitutionOption } from './can-viewer-see-substitution-option.util';
import type { Item } from '../../../domain/interfaces/item.interface';
import type { ItemSubstitutionRow } from '../../../domain/interfaces/item-substitution-row.interface';

const OWNER = 'owner-1';
const CLAIMER = 'claimer-1';

function child(overrides: Partial<Item> = {}): Item {
  return {
    Id: 'child-1',
    ListId: 'list-1',
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Alt',
    Description: null,
    IsHiddenIdea: true,
    IsSuggestion: false,
    Category: 'uncategorized',
    IsSubstitution: true,
    ...overrides,
  };
}

function row(overrides: Partial<ItemSubstitutionRow> = {}): ItemSubstitutionRow {
  return {
    Id: 'row-1',
    ParentItemId: 'parent-1',
    SubstitutionItemId: 'child-1',
    Kind: 'claimer_custom',
    CreatedByUserId: CLAIMER,
    SortOrder: 0,
    ...overrides,
  };
}

describe('canViewerSeeSubstitutionOption', () => {
  it('hides claimer custom hidden substitutions from the list owner', () => {
    expect(
      canViewerSeeSubstitutionOption({
        row: row(),
        child: child({ IsHiddenIdea: true }),
        wishlistOwnerId: OWNER,
        currentUserId: OWNER,
      })
    ).toBe(false);
  });

  it('shows claimer custom hidden substitutions to other viewers', () => {
    expect(
      canViewerSeeSubstitutionOption({
        row: row(),
        child: child({ IsHiddenIdea: true }),
        wishlistOwnerId: OWNER,
        currentUserId: CLAIMER,
      })
    ).toBe(true);
  });

  it('shows visible claimer custom substitutions to the owner', () => {
    expect(
      canViewerSeeSubstitutionOption({
        row: row(),
        child: child({ IsHiddenIdea: false }),
        wishlistOwnerId: OWNER,
        currentUserId: OWNER,
      })
    ).toBe(true);
  });

  it('always shows owner-approved substitutions', () => {
    expect(
      canViewerSeeSubstitutionOption({
        row: row({ Kind: 'owner_approved', CreatedByUserId: OWNER }),
        child: child({ IsHiddenIdea: true }),
        wishlistOwnerId: OWNER,
        currentUserId: OWNER,
      })
    ).toBe(true);
  });
});
