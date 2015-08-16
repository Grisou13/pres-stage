function TsfCompositionLayoutConverter(virtualKeyboardPlugin, windowHandle)
{
	this.toScreenCoordinates = function(compositionLayout, browserWindowLayout, callbackResultRect)
	{
		var result = { isVisible: compositionLayout.isVisible };

		if (result.isVisible)
		{
			virtualKeyboardPlugin.call("vk.GetBrowserWindowScreenCoordinates", [windowHandle],
				function(rect) {
					var browserWindowScreenBox = { left: rect[0], top: rect[1], right: rect[2], bottom: rect[3] };

					var scaleFactor = calculateScaleFactor(browserWindowScreenBox, browserWindowLayout);
					result.compositionTextRect = convertRectToScreenCoordinates(browserWindowScreenBox, scaleFactor, compositionLayout.compositionTextRect);
					result.selectedTextRect = convertRectToScreenCoordinates(browserWindowScreenBox, scaleFactor, compositionLayout.selectedTextRect);
					callbackResultRect(result);
				},
				function(errorCode) {
					console.log("vk.GetBrowserWindowScreenCoordinates failed: " + errorCode);
				});
		}
		else
		{
			callbackResultRect(result);
		}
	}

	function calculateScaleFactor(browserWindowScreenBox, browserWindowLayout)
	{
		if (browserWindowLayout.width == 0)
		{
			throw new Error("Width of the browser client area is 0");
		}
		return (browserWindowScreenBox.right - browserWindowScreenBox.left)/browserWindowLayout.width;
	}

	function convertRectToScreenCoordinates(browserWindowScreenBox, scaleFactor, rect)
	{
		return {
			left: Math.round(rect.left*scaleFactor + browserWindowScreenBox.left),
			top: Math.round(rect.top*scaleFactor + browserWindowScreenBox.top),
			right: Math.round(rect.right*scaleFactor + browserWindowScreenBox.left),
			bottom: Math.round(rect.bottom*scaleFactor + browserWindowScreenBox.top)
			};
	}
}
