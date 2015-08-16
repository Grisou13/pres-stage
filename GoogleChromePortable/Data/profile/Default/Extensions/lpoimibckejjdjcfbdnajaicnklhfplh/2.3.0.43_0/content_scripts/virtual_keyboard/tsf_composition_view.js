var KasperskyLabVirtualKeyboard = (function (ns)
{

ns.TsfCompositionView = function(inputElement, window, document)
{
    this.update = function(composition)
	{
		if (composition.text.length == 0)
		{
			hide();
		}
		else
		{
			show(composition);
		}
	}

    this.hide = function()
	{
		hide();
	}

	this.getLayout = function()
	{
		if (!m_view)
		{
			return { isVisible: false };
		}
		return {
			isVisible: true,
			compositionTextRect: KasperskyLab.getElementScreenPosition(getTextContainerElement()),
			selectedTextRect: getSelectionLayout()
			};
	}

	var m_view = null;

	var topZOrder = 'z-index:20000!important;';
	var noPadding = 'padding:0!important;';
	var noMargin = 'margin:0!important;';
	var noBorder = 'border-bottom:1px solid transparent!important;';
	var autoWidthHeight = 'width:auto!important;height:auto!important;';
	var fontSize = '16px';
	var textElementsStyle = noPadding + noMargin + topZOrder + autoWidthHeight +
		"font:" + fontSize + "/1 Arial,Helvetica,sans-serif!important;text-align:left!important;"+
		"white-space:nowrap!important;"
		;

	function show(composition)
	{
		if (!m_view)
		{
			m_view = { rootElement: createViewElement() };
			document.body.appendChild(m_view.rootElement);
			// TODO
			// addEvent(window, "resize", updateViewPosition);
			// TODO: the view should send updated coordinates to the plugin
			m_view.timer = setInterval(updateViewPosition, 500);
		}
		updateViewContent(composition);
		updateViewPosition();
	};

	function hide()
	{
		if (m_view)
		{
			if (m_view.timer)
			{
				clearInterval(m_view.timer);
				delete m_view.timer;
			}

			// removeEvent(window, "resize", updateViewPosition); // TODO

			removeElementFromDOM(m_view.rootElement);
			m_view = null;
		}
	};

	function removeElementFromDOM(element)
	{
		element.parentNode && element.parentNode.removeChild(element);
	}

	function createViewElement()
	{
		var viewElement = makeDiv(
			topZOrder + noMargin + autoWidthHeight +
"position:absolute!important;display:block!important;padding:11px 10px!important;"+
"text-align:left!important;border:1px solid #B2B2B2!important;border-radius:5px!important;"+
"background:#fff!important;"
			);
		appendChildsToParent(viewElement, createTextContainerElement());
		return viewElement;
	}

	function updateViewContent(composition)
	{
		var splitPoints = transformCompositionToSplitPoints(composition);
		var textContainerElement = createTextElements(composition.text, splitPoints);
		m_view.rootElement.replaceChild(textContainerElement, getTextContainerElement());
	}

	function getTextContainerElement()
	{
	    return m_view.rootElement.firstChild;
	}

	function createTextContainerElement()
	{
		return makeDiv(textElementsStyle + "position:static!important;display:block!important;background:#transparent!important;");
	}

	function transformCompositionToSplitPoints(composition)
	{
		var sortedRanges = sortRanges(
			makeRangesFromTextDecorations(composition.textDecorations)
			.concat(makeRangeFromSelection(composition))
			);
		var allPoints = generateArray(composition.text.length + 1, function() { return {}; });
		applySortedRanges(allPoints, sortedRanges);
		return selectSplitPoints(allPoints);
	}

	function sortRanges(ranges)
	{
		return ranges.sort(function(a, b) {
			if (a.start != b.start)
			{
				return a.start < b.start ? -1 : 1;
			}
			return a.end > b.end ? -1 : 1;
		});
	}

	function makeRangesFromTextDecorations(textDecorations)
	{
		var result = new Array(textDecorations.length);
		for (var i = 0; i < textDecorations.length; ++i)
		{
			result[i] = makeRangeFromTextDecoration(textDecorations[i]);
		}
		return result;
	}

	function makeRangeFromTextDecoration(textDecoration)
	{
		return {
			start: textDecoration.start,
			end: textDecoration.end,
			styles: {
				underlineStyle: textDecoration.underlineStyle,
				isBoldUnderline: textDecoration.isBoldUnderline
			}
		};
	}

	function makeRangeFromSelection(composition)
	{
		return composition.selectionStart == composition.selectionEnd ?
			{ start: composition.selectionStart, end: composition.selectionEnd, styles: { cursor: true } } :
			{ start: composition.selectionStart, end: composition.selectionEnd, styles: { selected: true } };
	}

	function applySortedRanges(allPoints, sortedRanges)
	{
		for (var i = 0; i < sortedRanges.length; ++i)
		{
			applyRange(allPoints, sortedRanges[i]);
		}
	}

	function applyRange(allPoints, range)
	{
		extendObject(allPoints[range.start], range.styles);
		for (var i = range.start + 1; i < range.end; ++i)
		{
			extendObject(allPoints[i], range.styles);
		}
	}

	function extendObject(object, addon)
	{
		for (var key in addon)
		{
	        if (addon.hasOwnProperty(key))
	        {
				object[key] = addon[key]
	        }
		}
		return object;
	}

	function selectSplitPoints(allPoints)
	{
		if (allPoints.length == 0)
		{
			return [];
		}
		var splitPoints = [];
		var prevStyle = { underlineStyle: 'none' };
		for (var i = 0; i < allPoints.length; ++i)
		{
			var currentStyle = allPoints[i];
			if (!equalStyles(prevStyle, currentStyle) || currentStyle.cursor)
			{
				splitPoints.push({ position: i, styles: currentStyle });
				prevStyle = currentStyle;
			}
		}
		if (splitPoints[splitPoints.length - 1].position != allPoints.length - 1)
		{
			splitPoints.push({ position: allPoints.length - 1, styles: currentStyle });
		}
		return splitPoints;
	}

	function equalStyles(a, b)
	{
		return a.underlineStyle == b.underlineStyle &&
			a.isBoldUnderline == b.isBoldUnderline &&
			a.selected == b.selected;
	}

	function generateArray(length, valueGenerator)
	{
		var array = new Array(length);
		for (var i = 0; i < length; ++i)
		{
			array[i] = valueGenerator();
		}
		return array;
	}

	function createTextElements(text, splitPoints)
	{
		var rootElement = createTextContainerElement();
		for (var i = 0; i < splitPoints.length; ++i)
		{
			if (splitPoints[i].styles.cursor)
			{
				var commonStyles = noPadding + noMargin + topZOrder + noBorder + "height:"
						+ fontSize + "!important;";
				var caretWrapperElement = makeDiv(commonStyles + "position:relative!important;display:inline!important;width:1px!important;");
				caretWrapperElement.selected = 1;
				var caretElement = makeDiv(commonStyles + "position:absolute!important;display:block!important;top:0!important;left:-1px!important;width:1px!important;background:#000!important;");
				appendChildsToParent(rootElement, appendChildsToParent(caretWrapperElement, caretElement));
			}
			if (i + 1 < splitPoints.length)
			{
				var colorStyle = splitPoints[i].styles.selected ?
					'color:#fff!important;background:#3297FD!important;' :
					'color:#000!important;background:#transparent!important;';
				var underlineStyle = getUnderlineStyle(splitPoints[i].styles.underlineStyle, splitPoints[i].styles.isBoldUnderline);
				var textElement = makeDiv(textElementsStyle + "position:static!important;display:inline!important;" + colorStyle + underlineStyle);
				textElement.selected = splitPoints[i].styles.selected ? 1 : 0;
				setInnerText(textElement, text.substr(splitPoints[i].position, splitPoints[i+1].position - splitPoints[i].position));
				appendChildsToParent(rootElement, textElement);
			}
		}
		return rootElement;
	}

	function getSelectionLayout()
	{
	    var container = getTextContainerElement();
	    var selectedElements = filter(container.childNodes, function(element) { return element.selected; });
	    if (!selectedElements.length)
	    {
	        return KasperskyLab.getElementScreenPosition(container);
	    }
	    var firstElement = selectedElements[0];
	    var lastElement = selectedElements[selectedElements.length - 1];
	    var topLeft = KasperskyLab.getElementScreenPosition(firstElement);
	    var bottomRight = KasperskyLab.getElementScreenPosition(lastElement);
	    return { top: topLeft.top, left: topLeft.left, bottom: bottomRight.bottom, right: bottomRight.right };
	}

	var underlineTypesToStylesConversionTable = {
		'solid': 'solid',
		'dotted': 'dotted',
		'dashed': 'dashed',
		'wavy': 'dotted'
	};

	function getUnderlineStyle(underlineType, isBold)
	{
		var style = underlineTypesToStylesConversionTable[underlineType];
		if (!style)
		{
			return noBorder;
		}
		var width = isBold ? '2px' : '1px';
		return 'border-bottom: ' + width + ' ' +  style + ' #000!important;border-top:none!important;border-left:none!important;border-right:none!important;';
	}

	function setInnerText(element, text)
	{
		if (typeof(element.textContent) != 'undefined')
		{
			element.textContent = text;
		}
		else
		{
			element.innerText = text;
		}
	}

	function updateViewPosition()
	{
		var view = m_view.rootElement;
		var inputPosition = getElementPositionInWindow(inputElement);
		var viewHeight = view.offsetHeight;
		var topInputWindowPosition = inputPosition.top - getPageScroll().top; // vertical position of the element relative to the window
		var bottomInputWindowPosition = getHeightOfVisiblePartOfPage() - topInputWindowPosition - inputElement.offsetHeight; // free space right to the element

		if (!m_view.currentPosition || m_view.currentPosition.top != inputPosition.top || m_view.currentPosition.left != inputPosition.left)
		{
			view.style.left = inputPosition.left + "px";

			if (bottomInputWindowPosition > viewHeight - 1)
			{
				view.style.top = (inputPosition.top + inputElement.offsetHeight - 1) + "px";
			}
			else
			{
				view.style.top = (inputPosition.top - viewHeight + 1) + "px";
			}
			m_view.currentPosition = inputPosition;
		}
	}

	function getElementPositionInWindow(element)
	{
		var top = 0;
		var left = 0;
				
		while (element)
		{
			top = top + element.offsetTop;
			left = left + element.offsetLeft;
			element = element.offsetParent;
		}
			
		return {
			left: left,
			top: top
		};
	}

	// Amount of vertical space before the currently visible part of the document
	function getPageScroll()
	{
		var xScroll;
		var yScroll;
		if (window.pageYOffset)
		{
			yScroll = window.pageYOffset;
			xScroll = window.pageXOffset;
		}
		else if (document.documentElement && document.documentElement.scrollTop)
		{
			yScroll = document.documentElement.scrollTop;
			xScroll = document.documentElement.scrollLeft;
		}
		else if (document.body)
		{
			yScroll = document.body.scrollTop;
			xScroll = document.body.scrollLeft;
		}
			
		return {
			left: xScroll,
			top: yScroll
		};
	}

	function getHeightOfVisiblePartOfPage()
	{
		var windowHeight;
		if (window.innerHeight)
		{
			windowHeight = window.innerHeight;
		}
		else if (document.documentElement && document.documentElement.clientHeight)
		{
			windowHeight = document.documentElement.clientHeight;
		}
		else if (document.body)
		{
			windowHeight = document.body.clientHeight;
		}
		return windowHeight;
	}

	function makeDiv(cssText)
	{
		var div = document.createElement('div');
		div.style.cssText = cssText || '';
		return div;
	}

	function appendChildsToParent(parent)
	{
		for (var i = 1, length = arguments.length; i < length; ++i)
		{
			parent.appendChild(arguments[i]);
		}
		return parent;
	}

	function filter(list, predicate)
	{
	    var result = [];
	    for (var i = 0; i < list.length; ++i)
	    {
	        if (predicate(list[i]))
	        {
	            result.push(list[i]);
	        }
	    }
	    return result;
	}
}

return ns;
}(KasperskyLabVirtualKeyboard || {}));
