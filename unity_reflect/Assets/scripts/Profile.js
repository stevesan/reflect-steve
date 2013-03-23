#pragma strict

//----------------------------------------
//  A single player's profile. Their progression state, etc.
//  Handles everything about levels, groups, unlocking levels, skipping, etc.
//----------------------------------------

private var level2group = [
    0, 0, 0, 0,
    1, 1, 1, 1,
    2, 2, 2, 2, 2,
    3, 3, 3,
    4, 4, 4, 4,
    5
    ];

function GetGroupNum( levId:int )
{
    return level2group[levId];
}

function GetNumGroups()
{
    return level2group[ level2group.length-1 ] + 1;
}

function GetFirstLevel(group:int)
{
    for( var lev = 0; lev < level2group.length; lev++ )
    {
        if( level2group[lev] == group )
            return lev;
    }
}

function GetLastLevel(group:int)
{
    for( var lev = level2group.length-1; lev >= 0; lev-- )
    {
        if( level2group[lev] == group )
            return lev;
    }
}

function IsLastLevelOfGroup( levId:int )
{
    return levId == GetLastLevel( GetGroupNum(levId) );
}

function GetIsGroupFinished(group)
{
    for( var lev = 0; lev < level2group.length; lev++ )
    {
        if( level2group[lev] == group && !HasBeatLevel(lev) )
            return false;
    }
    return true;
}

function GetUnfinishedLevelGroups()
{
    var groups = new HashSet.<int>();

    for( var levId = 0; levId < level2group.length; levId++ )
    {
        if( !HasBeatLevel(levId) )
            // level not beaten. So its group is unfinished
            groups.Add( GetGroupNum(levId) );
    }

    for( var gnum in groups )
        Debug.Log("not beat group "+gnum);

    return groups;
}

function HasBeatLevel(id:int) : boolean
{
    return PlayerPrefs.GetInt("beatLevel"+id, 0) == 1;
}

function IsLevelUnlocked(id:int)
{
    if( id == 0 ) return true;
    return PlayerPrefs.GetInt("levelAvail"+id, 0) == 1;
}

function CanSkipLevel(levId:int) : boolean
{
    return !HasBeatLevel(levId)
        && !IsLastLevelOfGroup(levId)
        && !IsLevelUnlocked(levId+1)
        ;
}

private function MaybeUnlockNextLevel(levId:int)
{
    if( GetGroupNum(levId) == GetNumGroups()-1 )
        return;

    // unlock next level?
    if( levId != IsLastLevelOfGroup(GetGroupNum(levId)) 
            || GetIsGroupFinished(GetGroupNum(levId)) )
    {
        PlayerPrefs.SetInt("levelAvail"+(levId+1), 1);
        PlayerPrefs.Save();
    }
}

function OnBeatLevel(levId:int)
{
	PlayerPrefs.SetInt("beatLevel"+levId, 1);
    PlayerPrefs.Save();

    MaybeUnlockNextLevel(levId);
}

function OnPlayingLevel(levId:int)
{
	PlayerPrefs.SetInt("currentLevelId", levId);
    PlayerPrefs.SetInt("playedLevel"+levId, 1);
    PlayerPrefs.Save();
}

function GetLastPlayedLevel()
{
    return PlayerPrefs.GetInt("currentLevelId", -1);
}

function HasPlayedLevel(levId:int)
{
    return PlayerPrefs.GetInt("playedLevel"+levId, 0);
}

function OnSkipLevel(levId:int)
{
    MaybeUnlockNextLevel(levId);
}

function Reset()
{
    for( var levId = 0; levId < level2group.length; levId++ )
    {
        PlayerPrefs.SetInt("beatLevel"+levId, 0);
        PlayerPrefs.SetInt("levelAvail"+levId, 0);
        PlayerPrefs.SetInt("playedLevel"+levId, 0);
        PlayerPrefs.SetInt("currentLevelId", -1);
        PlayerPrefs.Save();
    }
}

function SkipLevel(levId:int)
{
    if( CanSkipLevel(levId) )
    {
    }
}

