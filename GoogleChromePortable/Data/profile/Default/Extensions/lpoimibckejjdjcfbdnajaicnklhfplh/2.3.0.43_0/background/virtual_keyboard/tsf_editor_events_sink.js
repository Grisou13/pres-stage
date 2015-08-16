function TsfEditorEventsSink(virtualKeyboardPlugin, editorId)
{
	var plugin = virtualKeyboardPlugin;
	var editorId = editorId;

	this.onCompositionLayoutChange = function(rect)
	{
		if (rect.isVisible)
		{
			onVisibleCompositionLayoutChange(rect);
		}
		else
		{
			onInvisibleCompositionLayoutChange();
		}
	}

	function onInvisibleCompositionLayoutChange()
	{
		plugin.call("vk.tsfEventSink.onInvisibleCompositionLayoutChange", [editorId],
			function() { console.log("vk.tsfEventSink.onInvisibleCompositionLayoutChange() done"); },
			function(errorCode) { console.log("vk.tsfEventSink.onInvisibleCompositionLayoutChange() failed: " + errorCode); }
		);
	}	

	function onVisibleCompositionLayoutChange(rect)
	{
		compositionTextPoints = [rect.compositionTextRect.left, rect.compositionTextRect.top, rect.compositionTextRect.right, rect.compositionTextRect.bottom];
		selectedTextPoints = [rect.selectedTextRect.left, rect.selectedTextRect.top, rect.selectedTextRect.right, rect.selectedTextRect.bottom];	
		arguments = [editorId].concat(compositionTextPoints).concat(selectedTextPoints);

		plugin.call("vk.tsfEventSink.onVisibleCompositionLayoutChange", arguments,
			function() { console.log("vk.tsfEventSink.onVisibleCompositionLayoutChange() done"); },
			function(errorCode) { console.log("vk.tsfEventSink.onVisibleCompositionLayoutChange() failed: " + errorCode); }
		);
	}
}
