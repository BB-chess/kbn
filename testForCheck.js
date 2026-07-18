function testForCheck([aa, bb]) 
{
    makeMove([aa, bb]);
    let checkStatus = true;

    if (!inCheck()) 
	{
        if (aa !== bb) 
           moveArray.push([aa, bb]);
     	checkStatus = false;
    }     
    undoMove();
    return checkStatus;
}
