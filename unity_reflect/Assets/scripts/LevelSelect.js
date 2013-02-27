#pragma strict

import System.Collections.Generic;

var game:GameController = null;

var levelNumber:GUIText = null;
var wsLevelNumberOffset = Vector3(0.0, -1.0, 0.0);

private var prevMouseTarget:GameObject = null;
private var levelIcons:List.<GameObject> = null;
private var selectedLevId = -1;
private var mouseOver = new MouseEventManager();
private var iconMouseListeners:List.<MouseEventManager.Listener> = null;
private var state = "hidden";
private var shown = false;

function Awake()
{
    levelIcons = new List.<GameObject>();
    iconMouseListeners = new List.<MouseEventManager.Listener>();
    mouseOver.SetTargets(iconMouseListeners);

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

function GetIsLevelLastOfGroup( levId:int )
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
    //if( GetIsLevelLastOfGroup(levId) )
        //game.RequestLevelSelect();
}

function OnGameScreenShow()
{
    shown = true;

    // Reset state
    selectedLevId = -1;

    // Toggle level icons and gather render objects

    var unbeatGroups = GetUnfinishedLevelGroups();
    iconMouseListeners.Clear();

    for( var levId = 0; levId < levelIcons.Count; levId++ )
    {
        var iconObj = levelIcons[levId];

        // Only show level icons if the previous group is all finished
        if( unbeatGroups.Contains( GetGroupNum(levId)-1 ) )
            // previous group not finished yet. don't show this group yet
            iconObj.SetActive(false);
        else
        {
            iconObj.SetActive(true);

            // set icon depending on beat state
            var iconComp = iconObj.GetComponent(LevelIcon);
            iconComp.OnIsBeatenChanged( game.HasBeatLevel(levId) );
            iconMouseListeners.Add( new IconMouseListener(iconComp) );
        }
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
    shown = false;
}

function Update ()
{
    if( !shown )
        return;

    levelNumber.text = "";

    mouseOver.Update();
    var currTarget = mouseOver.GetCurrentTarget() as IconMouseListener;
    var currTargetId = mouseOver.GetCurrentTargetId();

    if( currTarget != null )
    {
        levelNumber.text = "" + (currTargetId+1);
        var p:Vector3 = Camera.main.WorldToViewportPoint( currTarget.icon.transform.position + wsLevelNumberOffset );

        levelNumber.transform.position.x = p.x;
        levelNumber.transform.position.y = p.y;

        if( Input.GetButtonDown('ReflectToggle') )
        {
            // clicked a carrot.
            // hide, and make sure to start the selected level once hidden
            selectedLevId = currTargetId;
            GetComponent(GameScreen).Hide();
        }
    }
}
