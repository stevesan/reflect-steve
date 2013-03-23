#pragma strict

import System.Collections.Generic;

var levelNumber:GUIText = null;
var notBeatErrorSound:AudioClip;
var wsLevelNumberOffset = Vector3(0.0, -1.0, 0.0);
var widgetSpacing = 1.0;
var nextIcon:GameObject;
var prevIcon:GameObject;
var profile:Profile;

//----------------------------------------
//  Footprints generation
//----------------------------------------
var printsStart:Transform;
var printsEnd:Transform;

class FootprintsPathGen
{
	var nodePrefab:GameObject;
	var curvePrefab:SubdivisionCurve;
	var printsPrefab:Footprints;

	var startOffset = Vector3(0,0,0);
	var midOffset = Vector3(0,0,0);
	var endOffset = Vector3(0,0,0);

	private var instances = new List.<GameObject>();

	function Create( topParent:Transform, start:Transform, end:Transform) : GameObject
	{
		var p0 = start.position + startOffset;
		var p1 = end.position + endOffset;
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

		var prints = GameObject.Instantiate( printsPrefab.gameObject, start.position, Quaternion.identity );
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

function OnGameScreenShow()
{
    state = "active";

    if( !keepGroupOnShow )
        currentGroup = profile.GetGroupNum( game.GetCurrentLevelId() );
    keepGroupOnShow = false;

	// Compute some numbers
    var firstLev = GetFirstLevel();
    var lastLev = GetLastLevel();
    var numLevs = lastLev - firstLev + 1;
    var prefab = widgetPrefabs[currentGroup];

	var isGroupFinished = profile.GetIsGroupFinished(currentGroup);

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

    if( currentGroup < profile.GetNumGroups()-1 )
    {
        nextIcon.SetActive(true);
        mouseListeners.Add( new ArrowListener(nextIcon) );
    }

	//----------------------------------------
	//  Footprints
	//----------------------------------------

	// create footprint paths
	printsAnims.Clear();
	var prevNode = printsStart;

	for( widget in widgets )
	{
		var anim = printsGen.Create( this.transform, prevNode, widget.transform);
		printsAnims.Add(anim);
		prevNode = widget.transform;
	}

    if( profile.HasBeatLevel(lastLev)
            && GetCurrentGroup() == profile.GetNumGroups()-1 )
	{
        // last one, from last carrot to the right of the screen
        var lastPrints = printsGen.Create( this.transform, prevNode, printsEnd );
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
