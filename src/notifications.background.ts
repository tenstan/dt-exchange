import browser from "webextension-polyfill"

browser.runtime.onMessage.addListener((request: any) => {
	browser.notifications.create("Example", {
		type: "basic",
		iconUrl: "https://placehold.co/32x32.png",
		title: "Titel",
		message: request.message.action,
	})
})
