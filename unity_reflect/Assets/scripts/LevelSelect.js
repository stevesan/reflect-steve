#pragma strict

import System.Collections.Generic;

static var main:LevelSelect = null;

var levelNumber:GUIText = null;
var mainText:GUIText = null;
var notBeatErrorSound:AudioClip;
var skyDecor:AlphaHierarchy;
var enterLevelSound:AudioClip;

// Offset of the numbers when you mouse over the carrots
var wsLevelNumberOffset = Vector3(0.0, -1.0, 0.0);

var widgetSpacing = 1.0;
var nextIcon:GameObject;
var prevIcon:GameObject;
var profile:Profile;

//----------------------------------------
//  The foot prints going off screen
//----------------------------------------
var printsStart:Transform;
var printsEnd:Transform;

//----------------------------------------
//  Manages the creation of foot print anims from one carrot to another
//----------------------------------------
class FootprintsPathGen
{
	var nodePrefab:GameObject;
	var curvePrefab:SubdivisionCurve;
	var printsPrefab:Footprints;

	var startOffset = Vector3(0,0,0);
	var midOffset = Vector3(0,0,0);
	var endOffset = Vector3(0,0,0);

	private var instances = new List.<GameObject>();

	function Create( topParent:Transform, start:Vector3, end:Vector3) : GameObject
	{
		var p0 = start + startOffset;
		var p1 = end + endOffset;
		var midPos = 0.5 * (p0+p1) + midOffset;

		var curve = GameObject.Instantiate( curvePrefab.gameObject, p0, Quaternion.identity );
		instances.Add(curve);
		curve.transform.parent = topParent;

		var node = GameObject.Instantiate( nodePrefab, p0, Quaternion.identity );
		instances.Add(node);
		node.name = "000";
		node.transform.parent = curve.transform;

		node = GameObject.Instantiate( nodePrefab, midPos, Quaternion.identity );
		instances.Add(node);
		node.name = "001";
		node.transform.parent = curve.transform;

		node = GameObject.Instantiate( nodePrefab, p1, Quaternion.identity );
		instances.Add(node);
		node.name = "002";
		node.transform.parent = curve.transform;

		var prints = GameObject.Instantiate( printsPrefab.gameObject, start, Quaternion.identity );
		instances.Add(prints);
		prints.GetComponent(Footprints).curveGen.curve = curve.GetComponent(SubdivisionCurve);
		prints.transform.parent = topParent;

		return prints;
	}

	function Clear()
	{
		for( var go:GameObject in instances )
		{
			GameObject.Destroy(go);
		}
		instances.Clear();
	}

};
var printsGen = new FootprintsPathGen();

private var game:GameController = null;
private var widgetPrefabs = new List.<GameObject>();

private var widgets = new List.<GameObject>();
private var printsAnims = new List.<GameObject>();
private var mouseMgr:MouseEventManager = null;
private var mouseListeners = new List.<MouseEventManager.Listener>();
private var state = "hidden";
private var currentGroup = -1;
private var keepGroupOnShow = false;
private var showTime = 0.0;

private var storyItems = new List.<GameObject>();
private var beatStoryItems = new List.<GameObject>();
private var showTitleCard = false;

class ArrowListener implements MouseEventManager.Listener
{
    var arrow:GameObject;

    function ArrowListener(_arrow)
    {
        this.arrow = _arrow;
    }

    function GetSpace() : String { return "world"; }

    function GetBounds() : Bounds
    {
        if( arrow != null )
            return arrow.GetComponent(Renderer).bounds;
    }

    function OnMouseEnter() : void { }

    function OnMouseExit() : void { }
};

function Awake()
{
	Utils.Assert( LevelSelect.main == null );
	LevelSelect.main = this;
	
    game = GameController.Singleton;
    if( game == null )
    {
        Debug.LogError("could not find gameController!");
    }

    // gather prefabs
    for( var g = 0; g < profile.GetNumGroups(); g++ )
	{
		// gather widgets/icons

		var prefabName = "levelwidget" + (g+1).ToString("0");
		var prefabXform = transform.Find(prefabName);
		if( prefabXform == null )
		{
			Debug.LogError("could not find "+prefabName);
		}
		var prefab = prefabXform.gameObject;
		if( prefab != null && prefab.GetComponent(LevelIcon) != null )
		{
			widgetPrefabs.Add(prefab);
			prefab.SetActive(false);
		}
	}
}

function Start()
{
    DeinitObjects();
	currentGroup = GetLastPlayedGroup();
 
    Utils.Connect( this, FadeCurtains.main, "OnCurtainsClosed" );
}

function DeinitObjects()
{
    // destroy all level widgets
    for( var widget in widgets )
    {
        Destroy(widget);
    }

    widgets.Clear();
    mouseListeners.Clear();
    printsGen.Clear();

    //----------------------------------------
    //  Just disable all children..screw it
    //----------------------------------------
    for( var child:Transform in transform )
    {
        child.gameObject.SetActive(false);
    }
}

function SwitchGroups()
{
    FadeCurtains.main.Close();
    state = "switchingGroups";
}

function OnCurtainsClosed()
{
    if( state == "cued" || state == "switchingGroups" )
    {
        DeinitObjects();

        if( showTitleCard )
        {
            state = "titlecard";
            TitleCards.main.Show();
        }
        else
        {
            showTitleCard = true;
            InitObjects();
            state = "shown";
        }
        FadeCurtains.main.Open();
    }
    else if( state == "titlecard" )
    {
        // show actual level select screen
        TitleCards.main.Hide();
        InitObjects();
        state = "shown";
        FadeCurtains.main.Open();
    }
    else if( state == "fadingToLevel" )
    {
        DeinitObjects();
        state = "hidden";
        // game is already cued to take over from here
    }
}

function GetCurrentGroup()
{
    return currentGroup;
}

function GetFirstLevel()
{
    return profile.GetFirstLevel( GetCurrentGroup() );
}

function GetLastLevel()
{
    return profile.GetLastLevel( GetCurrentGroup() );
}

function GetLastPlayedGroup()
{
	var lastPlayedLev = profile.GetLastPlayedLevel();
	if( lastPlayedLev == -1 )
		return 0;
	else
		return profile.GetGroupNum( lastPlayedLev );
}

function CueToShow(showTitleCard:boolean)
{
    if( state == "hidden" )
    {
        state = "cued";
        this.showTitleCard = showTitleCard;
    }
}

private function InitObjects()
{
    state = "shown";
	showTime = Time.time;

    for( var child:Transform in transform )
    {
        child.gameObject.SetActive(true);
    }

	// Compute some numbers
    var firstLev = GetFirstLevel();
    var lastLev = GetLastLevel();
    var numLevs = lastLev - firstLev + 1;
    var prefab = widgetPrefabs[currentGroup];

	//----------------------------------------
	//  Create level icon widgets
	//----------------------------------------

    mouseMgr = new MouseEventManager();
    mouseListeners.Clear();
    mouseMgr.SetTargets(mouseListeners);

    // hide all widget prefabs
    for( var p in widgetPrefabs )
        p.SetActive(false);

    var totalWidth = widgetSpacing * (numLevs-1);

	// Create carrots
    for( var lev = firstLev; lev <= lastLev; lev++ )
    {
        if( !profile.IsLevelUnlocked(lev) )
            continue;

        var xFromCenter = -totalWidth/2.0 + (lev-firstLev)*widgetSpacing;
        var p0 = prefab.transform.position;
        var pos = Vector3( transform.position.x+xFromCenter, p0.y, p0.z );
        var widget = Instantiate( prefab, pos, prefab.transform.rotation );
        widget.transform.parent = transform;
        widget.SetActive(true);
        widget.GetComponent(LevelIcon).levelId = lev;
        widget.GetComponent(LevelIcon).OnIsBeatenChanged( profile.HasBeatLevel(lev) );
        widgets.Add(widget);

        mouseListeners.Add( new IconMouseListener(widget.GetComponent(LevelIcon)) );
    }

	//----------------------------------------
	//  Arrows
	//----------------------------------------
    prevIcon.SetActive(false);
    nextIcon.SetActive(false);

    if( currentGroup > 0 )
    {
        prevIcon.SetActive(true);
        mouseListeners.Add( new ArrowListener(prevIcon) );
    }

    if( currentGroup < profile.GetNumGroups()-1 && profile.GetIsGroupFinished(GetCurrentGroup()) )
    {
        nextIcon.SetActive(true);
        mouseListeners.Add( new ArrowListener(nextIcon) );
    }

	//----------------------------------------
	//  Gift listeners
	//----------------------------------------

	if( profile.HasBeatGame() )
	{
        mainText.text = "Congrats, you finished the game!\nTry replaying levels and pressing F";
	}
	else
	{
		mainText.text = "";
	}

	//----------------------------------------
	//  Footprints
	//----------------------------------------

	// create footprint paths
	printsAnims.Clear();
	var prevPos = printsStart.position;

	for( widget in widgets )
	{
        var currPos = widget.transform.position;
        currPos.y = prevPos.y;
		var anim = printsGen.Create( this.transform, prevPos, currPos);
		printsAnims.Add(anim);
		prevPos = currPos;
	}

    if( profile.GetIsGroupFinished(GetCurrentGroup())
            && GetCurrentGroup() != profile.GetNumGroups()-1 )
	{
        // last one, from last carrot to the right of the screen
        var lastPrints = printsGen.Create( this.transform, prevPos, printsEnd.position );
		printsAnims.Add( lastPrints );

        if( profile.HasPlayedLevel(lastLev+1) )
        {
			// just show this one, don't play it
			lastPrints.SetActive(true);
			lastPrints.SendMessage("Stop");
			lastPrints.SendMessage("SkipToEnd");
        }
        else
        {
			anim.SetActive(true);
			anim.SendMessage("Play");
        }
	}

    // Toggle footprints

    for( lev = firstLev; lev <= lastLev; lev++ )
    {
        if( !profile.IsLevelUnlocked(lev) )
            continue;

		anim = printsAnims[lev-firstLev];

        if( !profile.HasPlayedLevel(lev) )
        {
			// play this one
			anim.SetActive(true);
			anim.SendMessage("Play");
        }
		else
		{
			// just show this one, don't play it
			anim.SetActive(true);
			anim.SendMessage("Stop");
			anim.SendMessage("SkipToEnd");
		}
    }

}

function Update()
{
    if( state == "titlecard" )
    {
        if( Input.GetMouseButtonDown(0) )
        {
            FadeCurtains.main.Close();
        }
    }
    else if( state == "shown" )
    {
        levelNumber.text = "";

        // Don't respond to mouse for a little bit, to avoid accidental clicks
        if( (Time.time-showTime) < 0.1 )
            return;

        mouseMgr.Update();
        var iconTarget = mouseMgr.GetCurrentTarget() as IconMouseListener;
        var arrowTarget = mouseMgr.GetCurrentTarget() as ArrowListener;

        if( iconTarget != null )
        {
            var targetLevId = iconTarget.icon.levelId;

            // show the number
            levelNumber.text = "" + (targetLevId+1);
            var wsTextPos = iconTarget.icon.transform.position;
            wsTextPos.y = iconTarget.GetBounds().max.y + 0.5;
            var textPos = Camera.main.WorldToViewportPoint( wsTextPos );
            levelNumber.transform.position.x = textPos.x;
            levelNumber.transform.position.y = textPos.y;

            if( Input.GetButtonDown('ReflectToggle') )
            {
                // clicked a carrot.
                // hide, and make sure to start the selected level once hidden
                game.CueLevelStart(targetLevId);
                FadeCurtains.main.Close();
                AudioSource.PlayClipAtPoint( enterLevelSound, Vector3(0,0,0) );
                state = "fadingToLevel";
            }
        }
        else if( arrowTarget != null )
        {
            // show text above the arrow
            if( arrowTarget.arrow == nextIcon )
                levelNumber.text = ">>";
            else 
                levelNumber.text = "<<";

            wsTextPos = arrowTarget.arrow.transform.position;
            wsTextPos.y = arrowTarget.GetBounds().max.y + 0.5;
            textPos = Camera.main.WorldToViewportPoint( wsTextPos );
            levelNumber.transform.position.x = textPos.x;
            levelNumber.transform.position.y = textPos.y;

            if( Input.GetButtonDown('ReflectToggle') )
            {
                if( arrowTarget.arrow == nextIcon && currentGroup < profile.GetNumGroups()-1 )
                {
                    if( profile.GetIsGroupFinished(currentGroup) )
                    {
                        currentGroup++;
                        SwitchGroups();
                    }
                    else
                    {
                        // shake the unbeat icons so player knows
                        for( var w in widgets )
                        {
                            var c = w.GetComponent(LevelIcon);
                            if( !profile.HasBeatLevel(c.levelId) )
                                c.OnNotBeatError();
                        }
                        AudioSource.PlayClipAtPoint( notBeatErrorSound, Vector3(0,0,0) );
                    }
                }
                else if( arrowTarget.arrow == prevIcon && currentGroup > 0 )
                {
                    currentGroup--;
                    SwitchGroups();
                }
            }
        }
    }
}
