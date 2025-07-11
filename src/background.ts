import browser from "webextension-polyfill"
let dashboardUrl = "https://accounts.atoma.cloud/dashboard"

import "./notifications.background.ts"

browser.action.onClicked.addListener(() => {
	browser.tabs.create({ url: dashboardUrl })
})
