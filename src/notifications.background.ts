import browser from "webextension-polyfill"
import { performCheck } from "./lib/darktide-store"
import { createFetcher } from "./utils"

// TODO: Error handling

const NOTIFICATIONS_ENABLED_STORAGE_KEY = "notifications-alarm-enabled"

browser.runtime.onMessage.addListener((request: unknown) => {
	if (
		typeof request === "object" &&
		request !== null &&
		"action" in request &&
		typeof request.action === "string"
	) {
		switch (request.action) {
			case "enable-notifications":
				browser.storage.local.set({
					[NOTIFICATIONS_ENABLED_STORAGE_KEY]: { enabled: true },
				})
				checkAlarmState()
				break
			case "disable-notifications":
				browser.storage.local.set({
					[NOTIFICATIONS_ENABLED_STORAGE_KEY]: { enabled: false },
				})
				checkAlarmState()
				break
		}
	}
})

async function checkAlarmState() {
	// TODO: Make sure this returns the object as expected
	const result = (await browser.storage.local.get(
		NOTIFICATIONS_ENABLED_STORAGE_KEY,
	)) as { [NOTIFICATIONS_ENABLED_STORAGE_KEY]: { enabled: boolean } }

	const isEnabled = result[NOTIFICATIONS_ENABLED_STORAGE_KEY]?.enabled

	if (isEnabled) {
		const alarm = await browser.alarms.get("notifications-alarm")

		console.debug("Checking whether an alarm is set.")

		if (!alarm) {
			console.debug("No alarm is set. Setting a new one.")
			const result = await callApi()

			if (result) {
				browser.alarms.create("notifications-alarm", {
					when: result.currentRotationEnd,
				})

				console.debug(
					`Next alarm will run on ${new Date(result.currentRotationEnd).toLocaleTimeString()}`,
				)
			}
		} else {
			console.debug("Alarm is already set.")
		}
	} else {
		console.debug("Alarm is disabled.")
	}
}

browser.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === "notification") {
		const result = await callApi()

		if (result) {
			const nextAlarmTimestamp = Math.max(
				result.currentRotationEnd,
				Date.now() + 30_000,
			) // Browsers enforce a minimum wait time of 30s between alarms

			browser.alarms.create("notifications-alarm", {
				when: nextAlarmTimestamp,
			})
		}
	}
})

browser.runtime.onInstalled.addListener(() => {
	checkAlarmState()
})

browser.runtime.onStartup.addListener(() => {
	checkAlarmState()
})

async function callApi() {
	const fatsharkUserResult = await browser.storage.local.get("fatshark-user")
	const fatsharkUser = fatsharkUserResult["fatshark-user"] as any

	const fetcher = createFetcher(fatsharkUser)
	const result = await performCheck(fetcher)

	if (!result) {
		return
	}

	await browser.notifications.create("notifications", {
		type: "basic",
		iconUrl: "https://placehold.co/48x48/000000/FFFFFF/png",
		title: "Armoury Exchange",
		message: `There are ${result.matches} item(s) matching your configured filter(s).`,
	})

	return { currentRotationEnd: result.currentRotationEnd }
}
