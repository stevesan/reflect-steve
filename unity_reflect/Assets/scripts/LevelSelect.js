#pragma strict

import System.Collections.Generic;

var game:GameController = null;

var levelNumber:GUIText = null;
var wsLevelNumberOffset = Vector3(0.0, -1.0, 0.0);

private var prevMouseTarget:GameObject = null;
private var levelIcons:List.<GameObject> = null;
private var selectedLevId = -1;

function Awake()
{
    levelIcons = new List.<GameObject>();

    for( var i = 0; ; i++ )
    {
        var iconName = "icon" + i.ToString("000");
        var iconXform = transform.Find(iconName);

        if( iconXform == null )
            break;

        levelIcons.Add(iconXform.gameObject);
    }

    Utils.Assert(game.GetLevels().Count >= levelIcons.Count);
}

function Start ()
{
}

function GetGroupNum( levId:int )
{
    return levelIcons[levId].GetComponent(LevelIcon).groupNumber;
}

function GetIsLevelLastInGroup( levId:int )
{
    return levId >= (levelIcons.Count-1)
        || GetGroupNum(levId+1) != GetGroupNum(levId);
}

function GetUnfinishedLevelGroups()
{
    var groups = new HashSet.<int>();

    for( var levId = 0; levId < levelIcons.Count; levId++ )
    {
        if( !game.HasBeatLevel(levId) )
            // level not beaten. So its group is unfinished
            groups.Add( GetGroupNum(levId) );
    }

    for( var gnum in groups )
        Debug.Log("not beat group "+gnum);

    return groups;
}

function OnBeatCurrentLevel()
{
    var levId = game.GetCurrentLevelId();

    // TODO need to return to level select when we finish a group..but GameController should take care of that really
    //if( GetIsLevelLastInGroup(levId) )
        //game.RequestLevelSelect();
}

function OnGameScreenShow()
{
    // Reset state
    selectedLevId = -1;

    // Toggle level icons

    var unbeatGroups = GetUnfinishedLevelGroups();

    for( var levId = 0; levId < levelIcons.Count; levId++ )
    {
        var iconObj = levelIcons[levId];

        // Only show level icons if the previous group is all finished
        if( unbeatGroups.Contains( GetGroupNum(levId)-1 ) )
            // previous group not finished yet. don't show this group yet
            iconObj.SetActive(false);
        else
            iconObj.SetActive(true);
    }

    // Toggle footprints

    for( var group = 0; ; group++ )
    {
        var printsTrans = transform.Find("prints"+group);

        if( printsTrans == null )
            break;
        else if( !unbeatGroups.Contains( group-1 ) )
        {
            // just show this one, don't play it
            printsTrans.gameObject.SetActive(true);
            printsTrans.gameObject.SendMessage("Stop");
            printsTrans.gameObject.SendMessage("SkipToEnd");
        }
        else
            printsTrans.gameObject.SetActive(false);
    }

    prevMouseTarget = null;

}

function OnGameScreenHidden()
{
    if( selectedLevId != -1 )
        game.StartLevel(selectedLevId);
}

function Update ()
{
    levelNumber.text = "";
    var clickPos = game.GetMouseXYWorldPos();

    var currTarget:GameObject = null; 
    var mouseOverLevId = -1;

    //----------------------------------------
    // Detect and generate mouse events
    //----------------------------------------
    for( var i = 0; i < levelIcons.Count; i++ )
    {
        var iconObj = levelIcons[i];

        if( !iconObj.activeInHierarchy )
            continue;

        var iconRender = iconObj.GetComponent(Renderer);

        if( iconRender == null )
            continue;

        var testPt = Vector3( clickPos.x, clickPos.y, iconRender.bounds.center.z );
        if( iconRender.bounds.Contains(testPt) )
        {
            currTarget = iconObj;
            mouseOverLevId = i;
            break;
        }
    }

    if( currTarget != prevMouseTarget )
    {
        if( currTarget != null )
            currTarget.SendMessage("OnMouseEnter", SendMessageOptions.DontRequireReceiver);

        if( prevMouseTarget != null )
            prevMouseTarget.SendMessage("OnMouseExit", SendMessageOptions.DontRequireReceiver);

        prevMouseTarget = currTarget;
    }

    if( mouseOverLevId >= 0 )
    {
        levelNumber.text = "" + (mouseOverLevId+1);
        var p:Vector3 = game.GetHostCam().WorldToViewportPoint( currTarget.transform.position + wsLevelNumberOffset );

        levelNumber.transform.position.x = p.x;
        levelNumber.transform.position.y = p.y;

        if( Input.GetButtonDown('ReflectToggle') )
        {
            // clicked a carrot.
            // hide, and make sure to start the selected level once hidden
            selectedLevId = mouseOverLevId;
            GetComponent(GameScreen).Hide();
        }
    }
}
