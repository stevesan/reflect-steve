#pragma strict

import System.Collections.Generic;

var game:GameController = null;

var levelNumber:GUIText = null;
var wsLevelNumberOffset = Vector3(0.0, -1.0, 0.0);

private var prevMouseTarget:GameObject = null;
private var levelIcons:List.<GameObject> = null;

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

function GetLevelGroup( levId:int )
{
    return levelIcons[levId].GetComponent(LevelIcon).groupNumber;
}

function GetIsLevelLastInGroup( levId:int )
{
    return levId >= (levelIcons.Count-1)
        || GetLevelGroup(levId+1) != GetLevelGroup(levId);
}

function GetUnfinishedLevelGroups()
{
    var groups = new HashSet.<int>();

    for( var levId = 0; levId < levelIcons.Count; levId++ )
    {
        if( !game.HasBeatLevel(levId) )
        {
            // level not beaten. So its group is unfinished
            groups.Add( GetLevelGroup(levId) );
        }
    }

    return groups;
}

function OnBeatCurrentLevel()
{
    var levId = game.GetCurrentLevelId();

    if( GetIsLevelLastInGroup(levId) )
        game.RequestLevelSelect();
}

function OnGameScreenShow()
{
    // Toggle level icons

    var remainGroups = GetUnfinishedLevelGroups();

    for( var levId = 0; levId < levelIcons.Count; levId++ )
    {
        var iconObj = levelIcons[levId];

        // Only show level icons if the previous group is all finished

        if( remainGroups.Contains( GetLevelGroup(levId)-1 ) )
        {
            // previous group not finished yet. don't show this group yet
            iconObj.SetActive(false);
        }
        else
        {
            iconObj.SetActive(true);
        }
    }

    // Toggle footprints

    for( var group = 0; ; group++ )
    {
        var printsTrans = transform.Find("prints"+group);

        if( printsTrans == null ) break;

        if( !remainGroups.Contains( group-1 ) )
            printsTrans.gameObject.SendMessage("Play");
    }

    prevMouseTarget = null;

}

function OnGameScreenHide()
{
}


function Update ()
{
    levelNumber.text = "";
    var clickPos = game.GetMouseXYWorldPos();

    var currTarget:GameObject = null; 
    var activeLevId = -1;

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
            activeLevId = i;
            break;
        }
    }

    if( currTarget != prevMouseTarget )
    {
        if( currTarget != null )
        {
            currTarget.SendMessage("OnMouseEnter", SendMessageOptions.DontRequireReceiver);
        }

        if( prevMouseTarget != null )
        {
            prevMouseTarget.SendMessage("OnMouseExit", SendMessageOptions.DontRequireReceiver);
        }

        prevMouseTarget = currTarget;
    }

    if( activeLevId >= 0 )
    {
        levelNumber.text = "" + (activeLevId+1);
        var p:Vector3 = game.GetHostCam().WorldToViewportPoint( currTarget.transform.position + wsLevelNumberOffset );

        levelNumber.transform.position.x = p.x;
        levelNumber.transform.position.y = p.y;

        if( Input.GetButtonDown('ReflectToggle') )
        {
            game.OnLevelSelected(activeLevId);
        }
    }
}
