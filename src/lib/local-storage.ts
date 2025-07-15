import browser from "webextension-polyfill"

const NAMESPACE = "armoury-exchange-"

const makeKey = (key: string) => `${NAMESPACE}${key}`

export function setLocalStorage(key: string, value: unknown) {
	localStorage.setItem(makeKey(key), JSON.stringify(value))
	browser.storage.local.set({ [key]: value })
}

export function getLocalStorage<T>(key: string): T | null {
	return JSON.parse(localStorage.getItem(makeKey(key)) ?? "null")
}
