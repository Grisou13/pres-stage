// TODO: put to a namespace

function Session(sessionId, requestId, tabId, url, method, eventSink)
{
	var m_sentEvents = {};
	var m_completed = false;
	var m_canceled = false;

	this.getSessionId = function()
	{
		return sessionId;
	}

	this.getRequestId = function()
	{
		return requestId;
	}

	this.getTabId = function()
	{
		return tabId;
	}

	this.getUrl = function()
	{
		return url;
	}

	this.getMethod = function()
	{
		return method;
	}

	this.isCompleted = function()
	{
		return m_completed;
	}

	this.isCanceled = function()
	{
		return m_canceled;
	}

	this.onRegister = function()
	{
		var eventId = 'cb.onBrowserSessionRegister';
		require(!m_completed, 'Error sending event ' + eventId + ': session is completed');
		require(!m_canceled, 'Error sending event ' + eventId + ': session is canceled');
		require(!isAlreadySent(eventId), 'Error sending event ' + eventId + ': event is already sent');
		sendEvent(eventId);
	}

	this.onUnregister = function()
	{
		var eventId = 'cb.onBrowserSessionUnregister';
		require(m_completed, 'Error sending event ' + eventId + ': session is not completed');
		require(!isAlreadySent(eventId), 'Error sending event ' + eventId + ': event is already sent');
		sendEvent(eventId);
	}

	this.onBeforeNavigate = function(method, isTopLevelContainer)
	{
		var eventId = 'cb.onBrowserSessionBeforeNavigate';
		require(!m_completed, 'Error sending event ' + eventId + ': session is completed');
		require(!isAlreadySent(eventId), 'Error sending event ' + eventId + ': event is already sent');
		sendEvent(eventId, url, method, KasperskyLab.toRpcBool(isTopLevelContainer));
	}

	this.onBeforeSendRequest = function(referer, accept)
	{
		var eventId = 'cb.onBrowserSessionBeforeSendRequest';
		require(!m_completed, 'Error sending event ' + eventId + ': session is completed');
		require(!isAlreadySent(eventId), 'Error sending event ' + eventId + ': event is already sent');
		sendEvent(eventId, referer, accept);
	}

	this.onProxyDetected = function(host, port)
	{
		require(host || port, 'Invalid arguments');
		var eventId = 'cb.onBrowserSessionProxyDetected';
		require(!m_completed, 'Error sending event ' + eventId + ': session is completed');
		require(!isAlreadySent(eventId), 'Error sending event ' + eventId + ': event is already sent');
		sendEvent(eventId, host, port, '', '');
	}

	this.onRemoteAddressDetected = function(remoteIpAddress)
	{
		require(!!remoteIpAddress, 'Invalid argument');
		var eventId = 'cb.onBrowserSessionRemoteAddressDetected';
		require(!m_completed, 'Error sending event ' + eventId + ': session is completed');
		require(!isAlreadySent(eventId), 'Error sending event ' + eventId + ': event is already sent');
		sendEvent(eventId, remoteIpAddress, 0);
	}

	this.onRequestCompleted = function()
	{
		var eventId = 'cb.onBrowserSessionRequestCompleted';
		require(!m_completed, 'Error sending event ' + eventId + ': session is completed');
		require(!isAlreadySent(eventId), 'Error sending event ' + eventId + ': event is already sent');
		sendEvent(eventId);
		m_completed = true;
	}

	this.toString = function()
	{
		return JSON.stringify({ sessionId: sessionId, requestId: requestId, tabId: tabId, url: url });
	}

	function sendEvent(eventId /*, ... parameters ... */)
	{
		//require(!!eventSink[eventId], 'No event handler for event ' + eventId);

		var eventArgs = [ sessionId ].concat(Array.prototype.slice.call(arguments, 1));

		eventSink.call(eventId, eventArgs, function(args){
			if (args && args.length == 1 && KasperskyLab.fromRpcBool(args[0]))
			{
				console.log('Session will be cancelled');
				m_canceled = true;
			}
		});

		markEventAsSent(eventId);
	}

	function markEventAsSent(eventId)
	{
		m_sentEvents[eventId] = true;
	}

	function isAlreadySent(eventId)
	{
		return m_sentEvents[eventId] ? true : false;
	}

	// TODO: move this function to a common place
	function require(condition, message)
	{
		if (!condition)
		{
			throw new Error(message ? message : 'Requirement failure');
		}
	}
}
