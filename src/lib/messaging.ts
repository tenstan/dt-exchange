import browser from "webextension-polyfill"

export async function enableNotifications() {
	return browser.runtime.sendMessage({ action: "enable-notifications" })
}

export async function disableNotifications() {
	return browser.runtime.sendMessage({ action: "disable-notifications" })
}
