var KasperskyLabOnlineBanking = (function (ns)
{

var kasperskyOnlineBankingPlugin = null;
var kasperskyTabsWatcher = null;
var kasperskyBrowserNavigator = null;

function registerAllTabs()
{
	forEachTab(function(tab)
	{
		kasperskyOnlineBankingPlugin.call('ob.RegisterTab', [tab.id]);
	});
}

ns.startup = function (plugin)
{
	try
	{
		kasperskyOnlineBankingPlugin = plugin;
		kasperskyTabsWatcher = new TabsWatcher(kasperskyOnlineBankingPlugin);
		kasperskyBrowserNavigator = new BrowserNavigator(kasperskyOnlineBankingPlugin);
		
		kasperskyOnlineBankingPlugin.call('ob.LinkPluginWithChromeExtention', [], registerAllTabs);
	}
	catch(e)
	{
		console.error("main.js. Exception: " + e);
	}
}

return ns;
}(KasperskyLabOnlineBanking || {}));
