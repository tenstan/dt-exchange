import { Character, CLASS_TYPES, FilterRule, STORE_TYPES } from "../types"
import isEqual from "fast-deep-equal"
import { max, uniqWith } from "lodash"
import { Items, MasterData, Store, Summary } from "../types"
import { Fetcher } from "../utils"
import { filterFunc } from "../components/Store"
import browser from "webextension-polyfill"

/*
 * Identifies which stores should be queried based on the configured filter rules of the user.
 *
 * This is mainly to avoid web requests to the Darktide API for any store that would net no matching items regardless of the user's filters.
 * For example, if the user owns a veteran but all their filter rules exclude the veteran archetype,
 * then no veteran stores will have to be checked.
 *
 * @param characters - The characters that the user owns
 * @param filterRules - The rule based filters that the user has configured
 * @returns An array of objects, each containing a type of store and its associated character.
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

export const performCheck = async (fetcher: Fetcher) => {
	const accountSummary = await fetcher<Summary>("/web/:sub/summary")

	const filterRulesResult = await browser.storage.local.get("filter-rules")
	const filterRules = filterRulesResult["filter-rules"] as any

	if (filterRules === null) {
		console.debug("No filter rules are configured to do any checking.")
		return
	}

	const storesToQuery = getRelevantStoresFromFilters(
		accountSummary.characters,
		filterRules,
	)

	const stores = await Promise.all(
		storesToQuery.map(async (store) => {
			const data = await fetcher<Store>(
				`/store/storefront/${store.storeType}_store_${store.character.archetype}?accountId=:sub&personal=true&characterId=${store.character.id}`,
			)

			return {
				data,
				metadata: {
					store: store.storeType,
					character: store.character,
				},
			}
		}),
	)

	const masterData = await fetcher<MasterData>("/master-data/meta/items")
	const masterListKey = masterData.playerItems.href
	const items = await fetcher<Items>(masterListKey)

	let count = 0
	for (const store of stores) {
		for (const pers of store.data.personal) {
			filterFunc(
				store.metadata.character,
				store.metadata.store,
				pers,
				filterRules,
				items,
			)

			if (
				pers.description.overrides.filter_match !== undefined &&
				pers.description.overrides.filter_match >= 0
			) {
				count++
			}
		}
	}

	const currentRotationEnd = max(
		stores.map((store) => store.data.currentRotationEnd),
	)!

	return {
		currentRotationEnd: parseInt(currentRotationEnd, 10),
		matches: count,
	}
}
