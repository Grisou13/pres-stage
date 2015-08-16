var KasperskyLabContentBlocker = (function (ns)
{
const FirstResultIndex = 0;
const SecondResultIndex = 1;

var ContentBlockedPage = chrome.extension.getURL('pages/content_blocked.html');
var DocumentReplaceTimeout = 500;

var m_kasperskyContentBlockerPlugin = null;
var m_sessionEventsAggregator = null;

var m_contentScriptRequestHandlers = {
	checkNeedToReload: onCheckNeedToReload,
	getBlockedPageContent: onGetBlockedPageContent
};
var m_tabAttachedData = new TabAttachedData();

// Called from Plugin
ns.reloadUrl = function (args)
{
	var urlToReload = args[0];
	var ignoreCache = args[1];
	var callbackId = args[2];
	
	// TODO: use forEachTab function
	chrome.windows.getAll({populate: true},
		function(windows)
		{
			for (var windowPos = 0; windowPos < windows.length; windowPos++)
			{
				var window = windows[windowPos];
				reloadUrlOnAllWindowTabs(urlToReload, ignoreCache, callbackId, window.id);
			}
		});
}

// Called from Plugin
// TODO: move document replacer to a separate class
ns.replaceDocumentWithHtml = function (args)
{
	var sessionId = args[0];
	var content = args[1];
	var callbackId = args[2];
	
	try
	{
		var session = m_sessionEventsAggregator.findSessionBySessionId(sessionId);
		require(!!session, 'Cannot replace html document: no session with id ' + sessionId);
		var tabId = session.getTabId();
		waitForTabToAppear(tabId,
		function() // onSuccess
		{
			var url = session.getUrl();
			// Try to replace the page in a nice way: using content script
			sendReplaceDocumentCommandWithTimeout(tabId, url, content, DocumentReplaceTimeout, function(replaceResult)
			{
				if (typeof(replaceResult) !== 'boolean') // The answer is not from the content script. Possible reason: http request was blocked by the plugin.
				{
					// Using the hard way
					m_tabAttachedData.set(tabId, 'blockedPageContent', content);
					chrome.tabs.update(tabId, { url: ContentBlockedPage }); // Redirect the whole tab to the plugin's internal page.
					m_kasperskyContentBlockerPlugin.call('cb.onReplaceResults', [callbackId, KasperskyLab.toRpcBool(true)]); 
				}
				else
				{
					m_kasperskyContentBlockerPlugin.call('cb.onReplaceResults', [callbackId, KasperskyLab.toRpcBool(replaceResult)]); 
				}
			});
		},
		function() // onFailure
		{
			m_kasperskyContentBlockerPlugin.call('cb.onReplaceResults', [callbackId, KasperskyLab.toRpcBool(false)]); 
		});
	}
	catch (e)
	{
		console.error('replaceDocumentWithHtml: ' + e);
	}
}

function sendReplaceDocumentCommandWithTimeout(tabId, url, content, timeout, callback)
{
	var request = {
		'name': 'replaceDocument',
		'url': url,
		'content': content
	};

	var callbackCalled = false;
	function callOnce(callback /* , ... */)
	{
		if (!callbackCalled)
		{
			callbackCalled = true;
			callback.apply(null, Array.prototype.slice.call(arguments, 1));
		}
	}

	setTimeout(function()
	{
		callOnce(callback);
	}, timeout);

	chrome.tabs.sendRequest(tabId, request, function(/* ... */)
	{
		callOnce(callback, arguments);
	
	});
}

function needToReloadDocumentWithUrl(urlToReload, documentUrl, callback)
{
	if (!urlToReload || !isHttpUrl(urlToReload))
	{
		callback(false);
	}
	else
	{
		m_kasperskyContentBlockerPlugin.call('cb.checkNeedToReloadUrl', [urlToReload, documentUrl],
			function(resultsFromPluginCall){ 
				var needToReloadUrl = resultsFromPluginCall[FirstResultIndex];
				callback(KasperskyLab.fromRpcBool(needToReloadUrl)); 
			});
	}
}

function reloadUrlOnTab(tabId, urlToReload, ignoreCache, callbackId)
{
	var request = {
		name: "reload",
		urlToReload: urlToReload,
		ignoreCache: ignoreCache
	};
	chrome.tabs.sendRequest(tabId, request,
		function(response)
		{
			if (response && response.isDocumentFound)
			{
				m_kasperskyContentBlockerPlugin.call('cb.onDocumentFound', [callbackId]);
			}
		});
}

function reloadUrlOnAllWindowTabs(urlToReload, ignoreCache, callbackId, windowId)
{
	// TODO: use forEachTab function
	chrome.tabs.getAllInWindow(windowId,
		function(tabs)
		{
			for (var i = 0, len = tabs.length; i < len; i++)
			{
				var tab = tabs[i];
				if (tab.url.indexOf("chrome://") == 0)	// not process internal pages
				{
					continue;
				}
				var resultCallback = function(id)
				{
					return function(result)
					{
						if (result)
						{
							chrome.tabs.update(id, { url: urlToReload });
							m_kasperskyContentBlockerPlugin.call('cb.onDocumentFound', [callbackId]);
						}
						else
						{
							reloadUrlOnTab(id, urlToReload, ignoreCache, callbackId);
						}
					}
				} (tab.id);

				needToReloadDocumentWithUrl(urlToReload, tab.url, resultCallback);
			}
		});
}

function onCheckNeedToReload(request, sender, sendResponse)
{
	needToReloadDocumentWithUrl(request.urlToReload, request.documentUrl,
		function(result)
		{
			sendResponse({ needToReload: result });
		});
}

function onGetBlockedPageContent(request, sender, sendResponse)
{
	var tabId = sender.tab && sender.tab.id;
	require(!!tabId, 'Invalid blocked page content request: ' + JSON.stringify(request));
	var content = m_tabAttachedData.get(tabId, 'blockedPageContent');
	require(!!content, 'Cannot find content for tab: ' + tabId);
	sendResponse({ content: content });
}

function contentScriptsRequestHandler(request, sender, sendResponse)
{
	try
	{
		if (request.name in m_contentScriptRequestHandlers)
		{
			m_contentScriptRequestHandlers[request.name](request, sender, sendResponse);
		}
	}
	catch (e)
	{
		console.error('Error handling request from content script: ' + e);
	}
}

// TODO: move this function to a common place
function isHttpUrl(url)
{
	return url.toLowerCase().match(/^https?:/) ? true : false;
}

/* TODO move inject to the single class*/
function initializeProductVersionInject()
{
    chrome.tabs.onUpdated.addListener(productVersionInjector);
}

function productVersionInjector(tabId, changeInfo, tab) 
{
    try 
    {
	    // TODO: don't call product for every tab update
        m_kasperskyContentBlockerPlugin.call('cb.approveProductInfoInjection', [tab.url],
        	function(resultsFromPluginCall)
        	{
        		var productInfoInjectionApproved = resultsFromPluginCall[FirstResultIndex];
        		if (KasperskyLab.fromRpcBool(productInfoInjectionApproved)) 
        		{
        			var productInfoInjectionScriptBody = resultsFromPluginCall[SecondResultIndex];
			        var request = {
			            "name" : "injectScript",
			            "body" : productInfoInjectionScriptBody
			        };
			        chrome.tabs.sendRequest(tabId, request);
        		};
        	});
    }
    catch (e)
    {
        console.error("productVersionInjector failed: " + e);
    }
}

ns.startup = function (plugin)
{
	try
	{
		m_kasperskyContentBlockerPlugin = plugin;

		m_kasperskyContentBlockerPlugin.call('cb.LinkPluginWithChromeExtention', [], 
			function(resultsFromPluginCall)
			{
				var pluginInitialized = resultsFromPluginCall[FirstResultIndex];

				if (KasperskyLab.fromRpcBool(pluginInitialized)) 
				{
					m_kasperskyContentBlockerPlugin.registerMethod('cb.replaceDocumentWithHtml', KasperskyLabContentBlocker.replaceDocumentWithHtml);
					m_kasperskyContentBlockerPlugin.registerMethod('cb.reloadUrl', KasperskyLabContentBlocker.reloadUrl);
					
					initializeProductVersionInject();

					chrome.extension.onRequest.addListener(contentScriptsRequestHandler);

					m_sessionEventsAggregator = new SessionEventsAggregator(m_kasperskyContentBlockerPlugin);
				}
				else
				{
					console.log('Kaspersky Content Blocker: product is not running');
				}
			});
	}
	catch(e)
	{
		console.error("main.js startup exception: " + e);
	}
}

// TODO: move this function to a common place
function require(condition, message)
{
	if (!condition)
	{
		throw new Error(message ? message : 'Requirement failure');
	}
}

return ns;
}(KasperskyLabContentBlocker || {}));


