var KasperskyLabVirtualKeyboard = (function (ns)
{
var g_tsfEditors = {};
var virtualKeyboardPlugin = null;

this.deliverProtectedKeyboardEventToFocusedTab = function(event)
{
	try
	{
		sendRequestToFocusedTab({ name: "deliverProtectedKeyboardEvent", event: event });
	}
	catch (e)
	{
		virtualKeyboardPlugin.call("vk.InputError", [],
            function() { console.log("vk.InputError done"); },
            function(errorCode) { console.error("vk.InputError failed: " + errorCode); });
	}
}

this.tsfEditorCreate = function(editorId, windowHandle, tsfEditorEventsSink)
{
	if (g_tsfEditors[editorId])
	{
		throw new Error('TSF editor already exists');
	}
	var layoutConverter = new TsfCompositionLayoutConverter(virtualKeyboardPlugin, windowHandle);
	g_tsfEditors[editorId] = new TsfEditorProxy(editorId, layoutConverter, tsfEditorEventsSink);
}

this.tsfEditorDestroy = function(editorId)
{
	var proxy = g_tsfEditors[editorId];
	delete g_tsfEditors[editorId];
	proxy.destroy();
}

this.tsfEditorInsertText = function(editorId, text)
{
	g_tsfEditors[editorId].insertText(text);
}

this.tsfEditorSetComposition = function(editorId, composition)
{
	g_tsfEditors[editorId].setComposition(composition);
}

this.SendUpdateToAllTabs = function()
{
	var request = { name: "Update" };
	forAllTabsInAllWindows(function(window, tab)
		{
			if (tab.url != "chrome://newtab/")
			{
				sendRequestToTab(request, tab);
			}
		});
}

function ShowVirtualKeyboard(tab)
{
	try
	{
		virtualKeyboardPlugin.call("vk.ShowVirtualKeyboard", [""],
            function() { console.log("vk.ShowVirtualKeyboard done"); },
            function(errorCode) { console.error("vk.ShowVirtualKeyboard failed: " + errorCode); });
	}
	catch(e)
	{
		console.error("main.js ShowVirtualKeyboard has exception: " + e);
	}
}

function ProcessShowVirtualKeyboard(request)
{
	try
	{
		virtualKeyboardPlugin.call("vk.ShowVirtualKeyboard", [request.url],
            function() { console.log("vk.ShowVirtualKeyboard done"); },
            function(errorCode) { console.error("vk.ShowVirtualKeyboard failed: " + errorCode); });
	}
	catch(e)
	{
		console.error("main.js ProcessShowVirtualKeyboard has exception: " + e);
	}
}

function ProcessFocus(request, callbackResult)
{
	try
	{
		virtualKeyboardPlugin.call("vk.ProcessFocus", [request.url, request.element.name, request.element.type],
		function(args)
		{
            var response = 
            {
                NeedVirtualKeyboardIcon: args[0],
                NeedSecurityInputTooltip: args[1]
            };

			callbackResult(response);
		},
		function(errorCode)
		{
			console.error("vk.ProcessFocus failed: " + errorCode);
		});
	}
	catch(e)
	{
		console.error("main.js ProcessFocus has exception: " + e);
	}
}

function ProcessBlur(callbackDone)
{
	try
	{
		virtualKeyboardPlugin.call("vk.ProcessBlur", [],
		function () {
		    callbackDone();
		},
		function (errorCode) {
		    console.error("vk.ProcessBlur failed: " + errorCode);
		});
	}
	catch(e)
	{
		console.error("main.js ProcessBlur has exception: " + e);
	}
}

function AddOnRequestListener()
{
	chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse)
	{
		try
		{
			if (request.name == "ShowVirtualKeyboard")
			{
				ProcessShowVirtualKeyboard(request);
			}
			else if (request.name == "ProcessFocus")
			{
				ProcessFocus(request, function(operationResult)
				{
					sendResponse(
						{
							needVirtualKeyboardIcon: operationResult.NeedVirtualKeyboardIcon,
							needSecurityInputTooltip: operationResult.NeedSecurityInputTooltip
						});
				});
			}
			else if (request.name == "ProcessBlur")
			{
				ProcessBlur(function()
                {
                    sendResponse();
                });
			}
			else if (request.name == "CurrentTabHasFocus")
			{
				if (sender.tab.selected)
					chrome.windows.get(sender.tab.windowId, function(window) { sendResponse(window.focused) });
				else
					sendResponse(false);
			}
			else if (request.name == "onTsfEditorCompositionLayoutChange")
			{
				if (g_tsfEditors[request.editorId])
				{
					g_tsfEditors[request.editorId].onCompositionLayoutChange(request.compositionLayout, request.windowLayout);
				}
			}
		}
		catch(exception)
		{
			console.error("main.js onRequest has exception: " + exception);
		}
	});
}

ns.startup = function (plugin)
{
    virtualKeyboardPlugin = plugin;

    try
	{
        RegisterEventListenerIncomingMethods();

        virtualKeyboardPlugin.call("vk.LinkPluginWithChromeExtension", [],
            function () 
            {
                chrome.browserAction.enable();
                chrome.browserAction.onClicked.addListener(ShowVirtualKeyboard);
                AddOnRequestListener();
            },
            function (errorCode) 
            { 
                console.error("vk.LinkPluginWithChromeExtension failed: " + errorCode);
            });
	}
	catch(exception)
	{
		console.error("main.js Startup exc: " + exception);
	}
}

function RegisterEventListenerIncomingMethods()
{
	var eventListener = new EventListener(this);

    virtualKeyboardPlugin.registerMethod("vk.eventListener.deliverProtectedKeyboardEvent", 
        function(args) // event
	    {
			var event = { text: args[0], keyCode: args[1], isCtrl: args[2], isAlt: args[3], isShift: args[4], isNumpad: args[5] };			
			eventListener.deliverProtectedKeyboardEvent(event);
		}
	);

    virtualKeyboardPlugin.registerMethod("vk.eventListener.updateView", 
        function(args) 
        {
			eventListener.SendUpdateToAllTabs(); 
		}
	);

    virtualKeyboardPlugin.registerMethod("vk.eventListener.tsfEditorCreate", 
        function(args) 
        { 
			var editorId = args[0];
			var windowHandle = args[1];
			var tsfEditorEventsSink = new TsfEditorEventsSink(virtualKeyboardPlugin, editorId);
            eventListener.tsfEditorCreate(editorId, windowHandle, tsfEditorEventsSink);
        }
	);

    virtualKeyboardPlugin.registerMethod("vk.eventListener.tsfEditorDestroy", 
        function(args)
        { 
			var editorId = args[0];
			eventListener.tsfEditorDestroy(editorId); 
		}
	);

    virtualKeyboardPlugin.registerMethod("vk.eventListener.tsfEditorInsertText", 
        function(args)
        { 
			var editorId = args[0];
			var text = args[1];
			eventListener.tsfEditorInsertText(editorId, text);
		}
	);

    virtualKeyboardPlugin.registerMethod("vk.eventListener.tsfEditorSetComposition", 
        function(args)
        {
			var editorId = args[0];
			var composition = {
				text: args[1],
				selectionStart: args[2],
				selectionEnd: args[3],
				textDecorations: args[4] ? JSON.parse(args[4]) : []
			};
			eventListener.tsfEditorSetComposition(editorId, composition);
		}
	);
}

return ns;
} (KasperskyLabVirtualKeyboard || {}));
