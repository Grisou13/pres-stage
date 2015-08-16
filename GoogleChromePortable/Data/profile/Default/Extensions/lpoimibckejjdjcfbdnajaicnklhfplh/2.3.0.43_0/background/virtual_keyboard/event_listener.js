function EventListener(keyboard)
{
	var m_keyboard = keyboard;

	this.deliverProtectedKeyboardEvent = function(event) 
	{
		tryCall(function() { m_keyboard.deliverProtectedKeyboardEventToFocusedTab(event) });
	}

	this.updateView = function() 
	{
		tryCall(function() { m_keyboard.SendUpdateToAllTabs(); });
	}

	this.tsfEditorCreate = function(editorId, windowHandle, tsfEditorEventsSink) 
	{
		tryCall(function() { m_keyboard.tsfEditorCreate(editorId, windowHandle, tsfEditorEventsSink); });
	}

	this.tsfEditorDestroy = function(editorId) 
	{
		tryCall(function() { m_keyboard.tsfEditorDestroy(editorId); });
	}

	this.tsfEditorInsertText = function(editorId, text) 
	{
		tryCall(function() { m_keyboard.tsfEditorInsertText(editorId, text); });
	}

	this.tsfEditorSetComposition = function(editorId, composition) 
	{
		tryCall(function() { m_keyboard.tsfEditorSetComposition(editorId, composition); });
	}

	function tryCall(callback)
	{
		try
		{
			callback();
 		}
		catch(e)
		{
			console.error(callback + "has exception: " + e);
		}
	}
}
