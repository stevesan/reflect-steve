#pragma strict

import System.Collections.Generic;


class ReflectItemsAnimation extends CodeAnimation
{
	var reflectOnSound:AudioClip;
	var reflectOffSound:AudioClip;
	private var screen:LevelSelect;

	function ReflectItemsAnimation(_screen)
	{
		super();
		screen = _screen;
	}

	function Update()
	{
		var step = 0;

		if( CheckStep(step++, 1.0) )
		{
			if( JustStartedStep() )
			{
				screen.mirror.SetActive(false);
				screen.upperGround.SetActive(false);
				screen.skyDecor.gameObject.SetActive(true);
				screen.skyDecor.SetLocalAlpha(1.0, true);
			}
		}
		else if( CheckStep(step++, 0.5) )
		{
			if( JustStartedStep() )
			{
				screen.mirror.SetActive(true);
				screen.upperGround.SetActive(true);
				AudioSource.PlayClipAtPoint(reflectOnSound, Camera.main.transform.position );
			}
			var f = GetStepFraction();
			screen.mirror.GetComponent(AlphaHierarchy).SetLocalAlpha(f, true);

			// make the ground fade in faster
			var groundAlpha = Mathf.Min( f*2.0, 1.0 );
			screen.upperGround.GetComponent(AlphaHierarchy).SetLocalAlpha(groundAlpha, true);
			screen.skyDecor.SetLocalAlpha(1-groundAlpha, true);
		}
		else if( CheckStep(step++, 1.0) )
		{
			if( JustStartedStep() )
			{
				screen.mirror.GetComponent(AlphaHierarchy).SetLocalAlpha(1.0, true);
				screen.skyDecor.gameObject.SetActive(false);
			}
		}
		else if( CheckStep(step++, 0.5) )
		{
			if( JustStartedStep() )
			{
				AudioSource.PlayClipAtPoint(reflectOffSound, Camera.main.transform.position );
			}
			screen.mirror.GetComponent(AlphaHierarchy).SetLocalAlpha(1-GetStepFraction(), true);
		}
		else if( CheckStep(step++, 0.0) )
		{
			screen.mirror.SetActive(false);
		}
		else
			return false;

		return true;
	}
}
var itemsAnim = new ReflectItemsAnimation(this);

var levelNumber:GUIText = null;
var notBeatErrorSound:AudioClip;
var skyDecor:AlphaHierarchy;

// Offset of the numbers when you mouse over the carrots
var wsLevelNumberOffset = Vector3(0.0, -1.0, 0.0);

var widgetSpacing = 1.0;
var nextIcon:GameObject;
var prevIcon:GameObject;
var profile:Profile;

var mirror:GameObject;
var upperGround:GameObject;

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
private var currentGroup = 0;
private var keepGroupOnShow = false;
private var selectedLevId = -1;
private var showTime = 0.0;

private var storyItems = new List.<GameObject>();
private var beatStoryItems = new List.<GameObject>();

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

class TrinketListener implements MouseEventManager.Listener
{
	var trinket:GameObject;
	var text:GUIText;

	function TrinketListener(_trinket)
	{
		this.trinket = _trinket;
	}

	function GetSpace() : String { return "world"; }

	function GetBounds() : Bounds
	{
		return trinket.GetComponent(Renderer).bounds;
	}

    function OnMouseEnter() : void
	{
		text.text = "TODO";
	}

    function OnMouseExit() : void
	{
		text.text = "";
	}
};

function Awake()
{
    game = GameObject.Find("gameController").GetComponent(GameController);
    if( game == null )
    {
        Debug.LogError("could not find gameController!");
    }

    // gather prefabs
    for( var g = 0; g < profile.GetNumGroups(); g++ )
    {
        var prefabName = "levelwidget" + (g+1).ToString("0");
        var prefabXform = transform.Find(prefabName);
        if( prefabXform == null )
        {
            Debug.LogError("could not find "+prefabName);
        }
        var prefab = prefabXform.gameObject;
        if( prefab != null && prefab.GetComponent(LevelIcon) != null )
        {
            Debug.Log("found " + prefabName);
            widgetPrefabs.Add(prefab);
            prefab.SetActive(false);
        }
    }

    for( var group = 0; group < profile.GetNumGroups(); group++ )
    {
        storyItems.Add(GetStoryItem(group, false));
        beatStoryItems.Add(GetStoryItem(group, true));
    }
}

function Start ()
{
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

private function ActivateText()
{
    var text = transform.Find("text").GetComponent(GUIText);
    if( profile.HasBeatGame() )
    {
        text.text = "You have finished the game - congrats!\nPress 'F' in-game for Free Reflection Mode";
    }
    else
    {
        text.text = "All progress is auto-saved\nGet all carrots to move on";
    }
}

private function GetStoryItem(group:int, groupBeat:boolean) : GameObject
{
    var suffix = groupBeat ? "b" : "";
    var name = "story"+group.ToString("00")+suffix;
    Debug.Log(name);
    return GameObject.Find(name);
}

function OnGameScreenShow()
{
// STEVETEMP
itemsAnim.Play();

    state = "active";
	showTime = Time.time;

    ActivateText();

    if( !keepGroupOnShow )
    {
        var lastPlayedLev = profile.GetLastPlayedLevel();
        if( lastPlayedLev == -1 )
            currentGroup = 0;
        else
            currentGroup = profile.GetGroupNum( lastPlayedLev );
    }
    keepGroupOnShow = false;

	// Compute some numbers
    var firstLev = GetFirstLevel();
    var lastLev = GetLastLevel();
    var numLevs = lastLev - firstLev + 1;
    var prefab = widgetPrefabs[currentGroup];

	//----------------------------------------
	//  Create level icon widgets
	//----------------------------------------

    mouseMgr = new MouseEventManager();
    mouseMgr.SetTargets(mouseListeners);

    // hide prefabs
    for( var p in widgetPrefabs )
        p.SetActive(false);

    var totalWidth = widgetSpacing * (numLevs-1);

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

    //----------------------------------------
    //  Story items
    //----------------------------------------

    for( var group = 0; group < profile.GetNumGroups(); group++ )
    {
        var i0 = storyItems[group];
        var i1 = beatStoryItems[group];

        if( false && group == GetCurrentGroup() )
        {
            var beat = profile.GetIsGroupFinished(GetCurrentGroup());
            if( i0 != null ) i0.SetActive(!beat);
            if( i1 != null ) i1.SetActive(beat);
        }
        else
        {
            if( i0 != null ) i0.SetActive(false);
            if( i1 != null ) i1.SetActive(false);
        }
    }
}

function OnGameScreenHidden()
{
    state = "inactive";

    // destroy all level widgets
    for( var widget in widgets )
    {
        Destroy(widget);
    }

    widgets.Clear();
    mouseListeners.Clear();
	printsGen.Clear();

    if( selectedLevId != -1 )
        game.StartLevel(selectedLevId);
}

function Update ()
{
    if( state != "active" )
        return;

	itemsAnim.Update();

    levelNumber.text = "";

    mouseMgr.Update();
    var currTarget = mouseMgr.GetCurrentTarget() as IconMouseListener;
    var arrowTarget = mouseMgr.GetCurrentTarget() as ArrowListener;

    if( currTarget != null )
    {
        var targetLevId = currTarget.icon.levelId;

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
            selectedLevId = targetLevId;
            GetComponent(GameScreen).Hide();
            state = "hiding";
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
                    selectedLevId = -1;
                    keepGroupOnShow = true;
                    GetComponent(GameScreen).Hide();
                    state = "hiding";
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
                selectedLevId = -1;
                keepGroupOnShow = true;
                GetComponent(GameScreen).Hide();
                state = "hiding";
            }
        }
    }
}
