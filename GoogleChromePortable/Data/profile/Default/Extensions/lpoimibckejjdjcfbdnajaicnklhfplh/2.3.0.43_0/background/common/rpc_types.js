var KasperskyLab = (function (ns)
{

ns.fromRpcBool = function (numericValue)
{
	return numericValue != 0;
}

ns.toRpcBool = function (boolValue)
{
	return +boolValue;
}

return ns;
}(KasperskyLab || {}));



