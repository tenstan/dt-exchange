import { uniqWith } from "lodash"
import { Character, CLASS_TYPES, FilterRule, STORE_TYPES } from "../types"
import isEqual from "fast-deep-equal"

/*
 * Identifies which stores should be queried based on the configured filter rules of the user.
 *
 * This is mainly to avoid web requests to the Darktide API for any store that would net no matching items regardless of the user's filters.
 * For example, if the user owns a veteran but all their filter rules exclude the veteran archetype,
 * then no veteran stores will have to be checked.
 *
 * @param characters - The characters that the user owns
 * @param filterRules - The rule based filters that the user has configured
 * @returns An array of objects, each containing a store and its associated character.
 */
export const getRelevantStoresFromFilters = (
	characters: Character[],
	filterRules: FilterRule[],
) => {
	// Extract every unique store type/archetype combination that exists in the user's rule based filters
	const storeTypeArchetypePairs = uniqWith(
		filterRules.flatMap((rule) => {
			const storeTypes = rule.store ?? STORE_TYPES
			const archetypes = rule.character ?? CLASS_TYPES

			return storeTypes.flatMap((storeType) =>
				archetypes.map((archetype) => ({ storeType, archetype })),
			)
		}),
		isEqual,
	)

	// For each character that the user owns, create entries for the stores to visit
	const relevantCharacterStores = characters.flatMap((character) =>
		storeTypeArchetypePairs
			.filter((store) => store.archetype === character.archetype)
			.map((store) => ({
				storeType: store.storeType,
				character,
			})),
	)

	return relevantCharacterStores
}
