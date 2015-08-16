//
// NativeMessaging Client
// RPC protocol: https://rd.hq.kaspersky.com/PMO/TP/Plugins/Documents/json_rpc.docx
//
// Interface (all methods throws exception):
// - registerMethod(methodName, function(args, callbackResult(arrayOfArguments, callback)) )
// - call(methodName, arrayOfArguments, function callbackResult(arrayOfArguments), function callbackError(errorCode))
// - close()
//
//
// Example:
//
// var kasperskyNativeMessagingClient = new KasperskyNativeMessagingClient('com.kaspersky_lab.native_messaging_host_test',
// function()
// {
//     console.log('client onDisconnect');
// });
//
// kasperskyNativeMessagingClient.registerMethod('sum', function(args, callback)
// {
//     callback(parseInt(args[0]) + parseInt(args[1]));
// });
//
// kasperskyNativeMessagingClient.call('div', [8, 4],
// function(args)
// {
//     console.log('OnResult div: ' + args[0]);
// },
// function(errorCode)
// {
//     console.log('OnError div: ' + errorCode);
// });
//

function KasperskyNativeMessagingClient(nativeHostName, callbackDisconnect)
{
	this.m_methods = {};
	this.m_calls = {};
	this.m_uniqueCommandId = 0;

    this.m_isConnected = true;
	this.m_nativeHost = chrome.runtime.connectNative(nativeHostName);

	instance = this;

	this.m_nativeHost.onMessage.addListener(function(obj)
	{
		try
		{
			//console.log("NM Message: " + obj);

			var messageType = parseInt(obj[0]);

			if (messageType == instance.MSG_CALL)
			{
				var callId = parseInt(obj[1]);
				var methodName = obj[2];
				var args = obj.slice(3);
				instance.processCommandCall(callId, methodName, args);
			}
			else if (messageType == instance.MSG_CALL_RESULT)
			{
				var callId = parseInt(obj[1]);
				var args = obj.slice(2);
				instance.processCommandCallResult(callId, args);
			}
			else if (messageType == instance.MSG_CALL_ERROR)
			{
				var callId = parseInt(obj[1]);
				var errorCode = parseInt(obj[2]);
				instance.processCommandCallError(callId, errorCode);
			}
			else
			{
				throw 'Unknown message type: ' + messageType;
			}

			//console.log("NM Message done");
		}
		catch(e)
		{
			instance.printException(e);
		}
	});

	this.m_nativeHost.onDisconnect.addListener(function()
	{
		try
		{
			//console.log("NM Disconnected: " + chrome.runtime.lastError.message);
            this.m_isConnected = false;
			callbackDisconnect();
            instance.callbackAllPendingOperations(-1);
		}
		catch(e)
		{
			instance.printException(e);
		}
	});
}

KasperskyNativeMessagingClient.prototype.MSG_CALL = 1;
KasperskyNativeMessagingClient.prototype.MSG_CALL_RESULT = 2;
KasperskyNativeMessagingClient.prototype.MSG_CALL_ERROR = 3;

KasperskyNativeMessagingClient.prototype.registerMethod = function(methodName, callback)
{
	if (instance.m_methods[methodName])
	{
		throw 'Already registered';
	}

	instance.m_methods[methodName] = callback;
	//console.log("NM Register method: " + methodName);
}

KasperskyNativeMessagingClient.prototype.call = function(methodName, arrayOfArgs, callbackResult, callbackError)
{
    if (!this.m_isConnected) 
    {
        throw "NM Sending message failed because of disconnecting";
    }

    var command = instance.createCommandCall(methodName, arrayOfArgs);
	instance.m_calls[command.id] = {
		callbackResult: function(){}, 
		callbackError: function(errorCode){ /*console.log(methodName + " return " + errorCode); */}
	};

	if (callbackResult != null && callbackResult != undefined){
		instance.m_calls[command.id].callbackResult = callbackResult;
	}
	
	if (callbackError != null && callbackError != undefined){
		instance.m_calls[command.id].callbackError = callbackError;
	}
	
	//console.log("NM Send message: " + command.payload);
	
	instance.m_nativeHost.postMessage(command.payload);
}

KasperskyNativeMessagingClient.prototype.createCommandCall = function(methodName, arrayOfArgs)
{
	var command = {};
	command.id = instance.createUniqueCommandId();
	command.payload = [instance.MSG_CALL, command.id, methodName].concat(arrayOfArgs);
	return command;
}

KasperskyNativeMessagingClient.prototype.createCommandCallResult = function(callId, arrayOfArgs)
{
	var command = {};
	command.id = callId;
	command.payload = [instance.MSG_CALL_RESULT, command.id].concat(arrayOfArgs);
	return command;
}

KasperskyNativeMessagingClient.prototype.createCommandCallError = function(callId, errorCode)
{
	var command = {};
	command.id = callId;
	command.payload = [instance.MSG_CALL_ERROR, command.id, errorCode];
	return command;
}

KasperskyNativeMessagingClient.prototype.createUniqueCommandId = function()
{
	return instance.m_uniqueCommandId++;
}

KasperskyNativeMessagingClient.prototype.processCommandCall = function(callId, methodName, arrayOfArgs)
{
	try
	{
		if (!instance.m_methods[methodName])
		{
			throw 'Method "' + methodName + '" not found';
		}

		var arrayOfResultArgs = instance.m_methods[methodName](arrayOfArgs, function(args)
		{
			var command = instance.createCommandCallResult(callId, args);
			//console.log("Send command result: " + command.payload);
			instance.m_nativeHost.postMessage(command.payload);
		});
	}
	catch(e)
	{
		instance.printException(e);
		var command = instance.createCommandCallError(callId, -1);
		instance.m_nativeHost.postMessage(command.payload);
	}
}

KasperskyNativeMessagingClient.prototype.close = function()
{
	instance.m_nativeHost.disconnect();
}

KasperskyNativeMessagingClient.prototype.processCommandCallResult = function(callId, args)
{
	try
	{
		if (!instance.m_calls[callId])
			throw 'Not found resultCallback for callId: ' + callId;

		instance.m_calls[callId].callbackResult(args);
		delete instance.m_calls[callId];
	}
	catch(e)
	{
		instance.printException(e);
	}
}

KasperskyNativeMessagingClient.prototype.processCommandCallError = function(callId, errorCode)
{
	try
	{
		if (!instance.m_calls[callId])
			throw 'Not found errorCallback for callId: ' + callId;

		instance.m_calls[callId].callbackError(errorCode);
		delete instance.m_calls[callId];
	}
	catch(e)
	{
		instance.printException(e);
	}
}

KasperskyNativeMessagingClient.prototype.printException = function(e)
{
	var text = 'NM exception: ' + e;
	if (e.stack)
		text = text + '\nstack:' + e.stack;

	console.error(text);
}

KasperskyNativeMessagingClient.prototype.callbackAllPendingOperations = function(errorCode)
{
    for (callInfo in instance.m_calls)
    {
        instance.m_calls[callInfo].callbackError(errorCode);
    }

    instance.m_calls = {};
}
