import { flatMap, max, uniq, uniqWith } from "lodash"
import {
	Character,
	CLASS_TYPES,
	FilterRule,
	Items,
	MasterData,
	Store,
	STORE_TYPES,
	Summary,
} from "./types"
import { createFetcher, getFatSharkUser } from "./utils"
import isEqual from "fast-deep-equal"
import { filterFunc } from "./components/Store"

const getStorefrontsToConsider = (
	characters: Character[],
	filterRules: FilterRule[],
) => {
	const availablePlayerClasses = uniq(
		characters.map((character) => character.archetype),
	)

	// Filter rules that are relevant to the player's characters
	const filteredFilterRules = filterRules.filter(
		(rule) =>
			rule.character === undefined ||
			rule.character.some((characterClass) =>
				availablePlayerClasses.includes(characterClass),
			),
	)

	// Get all unique storefront combinations based on the specified filter rules
	const relevantStorefronts = uniqWith(
		filteredFilterRules.flatMap((rule) => {
			const stores = rule.store || STORE_TYPES
			const classTypes = rule.character || CLASS_TYPES

			return flatMap(stores, (store) =>
				classTypes.map((classType) => ({ store, classType })),
			)
		}, isEqual),
	)

	// Finally create an storefront entry for every character that the player owns
	const characterStoreFronts = characters.flatMap((character) =>
		relevantStorefronts
			.filter((storefront) => storefront.classType === character.archetype)
			.map((storefront) => ({
				store: storefront.store,
				character,
			})),
	)

	return characterStoreFronts
}

export const performCheck = async () => {
	const user = getFatSharkUser()
	// TODO: figure out how to always have a valid user and remove the forgiving operator
	const fetcher = createFetcher(user!)

	const summary = await (fetcher("/web/:sub/summary") as Promise<Summary>)

	const filterRulesStorage = localStorage.getItem(
		"armoury-exchange-filter-rules",
	)

	if (!filterRulesStorage) {
		console.debug("No rules configured for notifier to go off.")
		return
	}

	const filterRules = JSON.parse(filterRulesStorage) as FilterRule[]

	const result = getStorefrontsToConsider(summary.characters, filterRules)

	const storePromises = result.map(async (storefront) => {
		const storeData = (await fetcher(
			`/store/storefront/${storefront.store}_store_${storefront.character.archetype}?accountId=:sub&personal=true&characterId=${storefront.character.id}`,
		)) as Store

		return {
			storeData,
			meta: {
				store: storefront.store,
				character: storefront.character,
			},
		}
	})

	const stores = await Promise.all(storePromises)

	const data = (await fetcher("/master-data/meta/items")) as MasterData
	const masterListKey = data.playerItems.href
	const items = (await fetcher(masterListKey)) as Items

	let count = 0
	for (const store of stores) {
		for (const pers of store.storeData.personal) {
			filterFunc(
				store.meta.character,
				store.meta.store,
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

	console.log(`There were ${count} matches.`)

	// TODO: return a different number if the currentRotationEnd would conflict with the minimum 30s increment of an alarm
	const nextSchedule = max(
		stores.map((store) => store.storeData.currentRotationEnd),
	)

	return { nextSchedule }
}
