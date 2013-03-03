#pragma strict

import System.Collections.Generic;


var levelNumber:GUIText = null;
var wsLevelNumberOffset = Vector3(0.0, -1.0, 0.0);
var widgetSpacing = 1.0;

private var game:GameController = null;
private var widgetPrefabs = new List.<GameObject>();

private var widgets = new List.<GameObject>();
private var mouseMgr:MouseEventManager = null;
private var mouseListeners = new List.<MouseEventManager.Listener>();
private var state = "hidden";
private var shown = false;
private var currentGroup = 0;

private var level2group = [
    0, 0, 0, 0,
    1, 1, 1, 1,
    2, 2, 2, 2, 2,
    3, 3, 3,
    4, 4, 4, 4,
    5
    ];

private var numGroups = 6;

function Awake()
{
    game = GameObject.Find("gameController").GetComponent(GameController);

    // gather prefabs
    for( var g = 0; g < numGroups; g++ )
    {
        var prefabName = "levelwidget" + (g+1).ToString("0");
        var prefab = GameObject.Find(prefabName);
        widgetPrefabs.Add(prefab);
        prefab.SetActive(false);
    }
}

function Start ()
{
}

function GetGroupNum( levId:int )
{
    return level2group[levId];
}

function GetCurrentGroup()
{
    return currentGroup;
}

function GetFirstLevel()
{
    for( var lev = 0; lev < level2group.length; lev++ )
    {
        if( level2group[lev] == GetCurrentGroup() )
            return lev;
    }
}

function GetLastLevel()
{
    for( var lev = level2group.length-1; lev >= 0; lev-- )
    {
        if( level2group[lev] == GetCurrentGroup() )
            return lev;
    }
}

function GetIsLevelLastOfGroup( levId:int )
{
    return levId >= (level2group.length-1)
        || GetGroupNum(levId+1) != GetGroupNum(levId);
}

function GetUnfinishedLevelGroups()
{
    var groups = new HashSet.<int>();

    for( var levId = 0; levId < level2group.length; levId++ )
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
    //if( GetIsLevelLastOfGroup(levId) )
        //game.RequestLevelSelect();
}

function OnGameScreenShow()
{
    shown = true;
    mouseMgr = new MouseEventManager();
    mouseMgr.SetTargets(mouseListeners);
    currentGroup = GetGroupNum( game.GetCurrentLevelId() );

    // Create widgets

    var firstLev = GetFirstLevel();
    var lastLev = GetLastLevel();
    var numLevs = lastLev - firstLev + 1;
    var prefab = widgetPrefabs[GetCurrentGroup()];

    var totalWidth = widgetSpacing * (numLevs-1);

    for( var lev = firstLev; lev <= lastLev; lev++ )
    {
        var xFromCenter = -totalWidth/2.0 + (lev-firstLev)*widgetSpacing;
        Debug.Log("xfrom center = "+xFromCenter);
        var p0 = prefab.transform.position;
        var pos = Vector3( transform.position.x+xFromCenter, p0.y, p0.z );
        var widget = Instantiate( prefab, pos, prefab.transform.rotation );
        widget.transform.parent = transform;
        widget.SetActive(true);
        widget.GetComponent(LevelIcon).OnIsBeatenChanged( game.HasBeatLevel(lev) );
        widgets.Add(widget);

        mouseListeners.Add( new IconMouseListener(widget.GetComponent(LevelIcon)) );
    }

    /*
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
    */
}

function OnGameScreenHidden()
{
    shown = false;

    // destroy all level widgets
    for( var widget in widgets )
    {
        Destroy(widget);
    }

    widgets.Clear();
    mouseListeners.Clear();
}

function Update ()
{
    if( !shown )
        return;

    levelNumber.text = "";

    mouseMgr.Update();
    var currTarget = mouseMgr.GetCurrentTarget() as IconMouseListener;
    var currTargetId = mouseMgr.GetCurrentTargetId();

    if( currTarget != null )
    {
        var targetLevId = GetFirstLevel() + currTargetId;

        // show the number
        levelNumber.text = "" + (targetLevId+1);
        var wsTextPos = currTarget.icon.transform.position;
        wsTextPos.y = currTarget.GetBounds().max.y + 0.5;
        var textPos = Camera.main.WorldToViewportPoint( wsTextPos );
        levelNumber.transform.position.x = textPos.x;
        levelNumber.transform.position.y = textPos.y;

        if( Input.GetButtonDown('ReflectToggle') )
        {
            // clicked a carrot.
            // hide, and make sure to start the selected level once hidden
            game.StartLevel(targetLevId);
            GetComponent(GameScreen).Hide();
        }
    }
}
