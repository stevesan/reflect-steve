#pragma strict

//----------------------------------------
//  A single player's profile. Their progression state, etc.
//  Handles everything about levels, groups, unlocking levels, skipping, etc.
//----------------------------------------

function GetCanSkipLevel(levId:int) : boolean
{
}

function SkipLevel(levId:int)
{
    if( GetCanSkipLevel(levId) )
    {
    }
}

