import { expect, describe, test, beforeEach } from "vitest"
import { Character, FilterRule } from "../types"
import { getRelevantStoresFromFilters } from "./darktide-store"

describe(getRelevantStoresFromFilters.name, () => {
	let veteran1: Character
	let veteran2: Character
	let zealot1: Character
	let psyker1: Character

	beforeEach(() => {
		veteran1 = {
			id: "veteran1",
			name: "Veteran1",
			archetype: "veteran",
			gender: "male",
			level: 30,
			specialization: "specialization",
		}

		veteran2 = {
			id: "veteran2",
			name: "Veteran2",
			archetype: "veteran",
			gender: "male",
			level: 30,
			specialization: "specialization",
		}

		zealot1 = {
			id: "zealot1",
			name: "Zealot1",
			archetype: "zealot",
			gender: "male",
			level: 30,
			specialization: "specialization",
		}

		psyker1 = {
			id: "psyker1",
			name: "Psyker1",
			archetype: "psyker",
			gender: "male",
			level: 30,
			specialization: "specialization",
		}
	})

	test("should return a single store when a rule is configured for one character and one store", () => {
		const characters: Character[] = [veteran1]
		const filterRules: FilterRule[] = [
			{ store: ["credits"], character: ["veteran"] },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{
				store: "credits",
				character: veteran1,
			},
		])
	})

	test("should return no results when user has no characters", () => {
		const characters: Character[] = []
		const filterRules: FilterRule[] = [{ store: ["credits"] }]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([])
	})

	test("should return no results when user has no filters", () => {
		const characters: Character[] = [veteran1]
		const filterRules: FilterRule[] = []

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([])
	})

	test("should consider all characters when rule based filter has no defined 'character' rule", () => {
		const characters: Character[] = [veteran1, zealot1]
		const filterRules: FilterRule[] = [
			{ store: ["credits"], character: undefined },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{
				store: "credits",
				character: veteran1,
			},
			{
				store: "credits",
				character: zealot1,
			},
		])
	})

	test("should consider all store variants when rule based filter has no defined 'store' rule", () => {
		const characters: Character[] = [veteran1]
		const filterRules: FilterRule[] = [
			{ character: ["veteran"], store: undefined },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{
				store: "credits",
				character: veteran1,
			},
			{
				store: "marks",
				character: veteran1,
			},
		])
	})

	test("should consider all characters and stores when rule based filter has no defined 'characters' and 'store' rule", () => {
		const characters: Character[] = [veteran1, zealot1]
		const filterRules: FilterRule[] = [
			{ character: undefined, store: undefined },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{
				store: "credits",
				character: veteran1,
			},
			{
				store: "marks",
				character: veteran1,
			},
			{
				store: "credits",
				character: zealot1,
			},
			{
				store: "marks",
				character: zealot1,
			},
		])
	})

	test("should not include characters that are be filtered based on the configured rules", () => {
		const characters: Character[] = [veteran1, veteran2, zealot1, psyker1]
		const filterRules: FilterRule[] = [
			{ store: ["marks"], character: ["veteran", "zealot"] },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{
				store: "marks",
				character: veteran1,
			},
			{
				store: "marks",
				character: veteran2,
			},
			{
				store: "marks",
				character: zealot1,
			},
		])
	})

	test("should combine multiple rule based filters correctly", () => {
		const characters: Character[] = [veteran1, zealot1]
		const filterRules: FilterRule[] = [
			{ store: ["marks"], character: undefined },
			{ store: undefined, character: ["veteran"] },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{
				store: "marks",
				character: veteran1,
			},
			{
				store: "credits",
				character: veteran1,
			},
			{
				store: "marks",
				character: zealot1,
			},
		])
	})

	test("should consider different stores across multiple rule based filters", () => {
		const characters: Character[] = [veteran1]
		const filterRules: FilterRule[] = [
			{ store: ["credits"], character: ["veteran"] },
			{ store: ["marks"], character: ["veteran"] },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{
				store: "credits",
				character: veteran1,
			},
			{
				store: "marks",
				character: veteran1,
			},
		])
	})

	test("should only consider characters that match the specified type in the rule based filter", () => {
		const characters = [veteran1, zealot1, psyker1]
		const filterRules: FilterRule[] = [
			{ store: ["marks"], character: ["veteran", "zealot"] },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([
			{ store: "marks", character: veteran1 },
			{ store: "marks", character: zealot1 },
		])
	})

	test("should return empty array when no characters match the configured character rule", () => {
		const characters = [veteran1, zealot1]
		const filterRules: FilterRule[] = [
			{ store: ["credits"], character: ["psyker", "ogryn"] },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([])
	})

	test("should deduplicate identical store-character combinations", () => {
		const characters: Character[] = [veteran1]

		const filterRules: FilterRule[] = [
			{ store: ["credits"], character: ["veteran"] },
			{ store: ["credits"], character: ["veteran"] },
		]

		const stores = getRelevantStoresFromFilters(characters, filterRules)

		expect(stores).toEqual([
			{
				store: "credits",
				character: veteran1,
			},
		])
	})

	test("should deduplicate when different rules produce the same combinations", () => {
		const characters = [veteran1]
		const filterRules: FilterRule[] = [
			{ store: ["credits"], character: ["veteran"] },
			{ store: ["credits"], character: undefined },
		]

		const result = getRelevantStoresFromFilters(characters, filterRules)

		expect(result).toEqual([{ store: "credits", character: veteran1 }])
	})
})
