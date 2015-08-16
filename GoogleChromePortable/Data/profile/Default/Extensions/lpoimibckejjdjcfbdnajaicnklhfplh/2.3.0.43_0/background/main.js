chrome.browserAction.disable();
var plugin = new KasperskyNativeMessagingClient('com.kaspersky.kav.fc580de9124e479b8be54721f5fb2f59.host', 
function() // OnDisconnect
{
	console.log("KasperskyNativeMessagingClient OnDisconnect");
});
// KasperskyLabManageability must be the first
KasperskyLabManageability.startup(plugin);
KasperskyLabContentBlocker.startup(plugin);
KasperskyLabOnlineBanking.startup(plugin);
KasperskyLabVirtualKeyboard.startup(plugin);
