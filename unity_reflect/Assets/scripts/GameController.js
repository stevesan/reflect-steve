#pragma strict

import System.IO;
import System.Text;

static var Singleton : GameController = null;

//----------------------------------------
//  Object references
//----------------------------------------
var hostcam : Camera;
var snapReflectAngle = true;
var snapReflectPosition = true;
var levelSelectScreen:LevelSelect;
var menu:CornerMenu;
var profile:Profile;

// Controls how fast the preview spins
private var previewRotateSpeed = 1.5*Mathf.PI;
private var previewTranslateSpeed = 15.0;

// For the unlocked "free mode"
private var freeRotateSpeed = 0.5*Mathf.PI;
var freeMode = false;

#if UNITY_EDITOR
private var isEditor = true;
#else
private var isEditor = false;
#endif

//----------------------------------------
//  Components instances we use
//----------------------------------------
var tracker:Tracking = null;

//----------------------------------------
//  Prefabs/Puppet-objects
//----------------------------------------
var mirrorCount : MirrorCount;
private var ssMirrorCountOffset = Vector2(20, 0);	// pixels
var levelNumber : GUIText;

var player : GameObject;
var carrotPrefab : GameObject;
var keyPrefab : GameObject;
var keyFx : GameObject;
var ballKeyPrefab : GameObject;
var mirrorPrefab : GameObject = null;
var background : GameObject;
var safeArea : SafeArea;
var startscreen:GameObject;

//----------------------------------------
//  Objects for level geometry/UI
//----------------------------------------
var mainPolygon : MeshFilter;	// rendering the fill-triangles for the active collision geometry
var mainOutline : MeshFilter;
var mainOutlineWidth  = 0.5;
private var outlineBuffer = new MeshBuffer();

var rockCollider : DynamicMeshCollider;
var rockPolygon : MeshFilter;
var rockOutline : MeshFilter;
var rockStrokeWidth = 0.5;
private var rockOutlineBuffer = new MeshBuffer();

var previewPolygon : MeshFilter;	// rendering the fill-triangles of the preview
var previewOutline : MeshFilter;
private var previewOutlineBuffer = new MeshBuffer();

var debugHost:DebugTriangulate = null;

var mirrorPosIcon : Renderer;

var conveyorsMesh : MeshFilter;
var conveyorsStrokeWidth = 0.01;
private var conveyorsBuffer = new MeshBuffer();


//----------------------------------------
//  Fading state
//----------------------------------------
var mainLight : Light;
var fadeOutTime = 0.5;
var fadeInTime = 0.1;
var fastFadeOutTime = 0.25;
var fastFadeInTime = 0.25;
private var doFastFade = false;
private var origLightIntensity : float;

//----------------------------------------
//  Assets
//----------------------------------------
var levelsText : TextAsset;

// Use this to hide levels not ready for prime time..
#if UNITY_EDITOR
private var maxNumLevels = 22;
#else
private var maxNumLevels = 22;
#endif

//----------------------------------------
//  Sounds
//----------------------------------------
var goalGetSound : AudioClip;
var startReflectSnd : AudioClip;
var cancelReflectSnd : AudioClip;
var confirmReflectSnd : AudioClip;
var goalLockedSound: AudioClip;
var maxedReflectionsSnd: AudioClip;
var freeModeSnd : AudioClip;

class RotationSounds
{
	var clips:AudioClip[];
	private var sources:FadeableSource[];
	
	function Init()
	{
		sources = new FadeableSource[ clips.length ];
		for( var i = 0; i < clips.length; i++ ) {
			var obj = new GameObject();
			var src = obj.AddComponent(AudioSource);
			src.clip = clips[i];
			sources[i] = new FadeableSource(src, 0.0, 0.01, 1.0);
			sources[i].SetStopOnFadeOut(true);
		}
	}
	
	function Play(rads:float)
    {
		rads -= Mathf.PI/2;	// we want the direction the mirror is "facing", not the line
		var slice = Mathf.RoundToInt( rads/(Mathf.PI/4) );
		while(slice < 0) slice += sources.length;
		var srcId = slice % sources.length;
		var pan = Mathf.Cos(rads);
		sources[srcId].src.pan = pan;
		
		for( var i = 0; i < sources.length; i++ ) {
			if( i == srcId ) {
				sources[i].Play();
				sources[i].FadeIn();
			}
			else {
				sources[i].FadeOut();
			}
		}
		
	}
}
var rotationSounds = new RotationSounds();

//----------------------------------------
//  Debug
//----------------------------------------
var debugColor = Color.red;
var debugSecs = 0.0;
var debugUnlimited = false;
var debugDrawPolygonOutline = false;

//----------------------------------------
//  Per-session state
//----------------------------------------
private var levels : List.<LevelInfo> = null;
private var currLevId : int = 0;	// current level
private var goalLevId : int = 0;	// which level we're fading into
private var currLevPoly : Mesh2D = null;	// current effective geometry
private var currConveyors : List.<Mesh2D> = null;
private var gamestate:String;
private var preFadeState:String;
private var postFadeState:String;

function GetState() : String { return gamestate; }
function IsFreeMode() { return freeMode; }

function GetIsInLevel() { return gamestate == 'playing'; }

//----------------------------------------
//  Per-level state
//----------------------------------------
private var numKeysGot = 0;
private var numKeys = 0;
private var numCarrotsGot = 0;
private var objectInsts = new List.<GameObject>();
private var carrotRefs = new List.<Star>();

class Conveyors
{
    private var objs : List.<GameObject>;

    function DestroyAll()
    {
        for( obj in objs ) {
            GameObject.Destroy(obj);
        }
    }

    function Reset( conveyors:List.<Mesh2D>, capRadius:float )
    {
        DestroyAll();

        objs = new List.<GameObject>();

        //----------------------------------------
        // Create actual objects, once for each edge...this is for the better
        //----------------------------------------
        for( var iconv = 0; iconv < conveyors.Count; iconv++ ) {
            var conv = conveyors[iconv];
            for( var iedge = 0; iedge < conv.GetNumEdges(); iedge++ ) {
                var p1 = conv.GetEdgeStart(iedge);
                var p2 = conv.GetEdgeEnd(iedge);
                var obj = new GameObject("conv " + iconv + " edge " + iedge);
                objs.Add(obj);
                var comp = obj.AddComponent(Conveyor);
                comp.Initialize( p1, p2, capRadius );
            }
        }
    }
}
private var convsInst:Conveyors = null;

//----------------------------------------
//  Reflection UI state
//----------------------------------------
private var isReflecting = false;
private var justEnteredReflecting = false;
private var numReflectionsDone = 0;
private var numReflectionsAllowed = 0;
private var lineStart = Vector2(0,0);
private var goalLineStart = Vector2(0,0);
private var lineEnd = Vector2(0,0);
private var mirrorAngle = 0.0;
private var goalMirrorAngle = 0.0;

function GetLevel() : LevelInfo { return levels[currLevId]; }
function GetLevels() : List.<LevelInfo> { return levels; }

function GetIsReflecting() : boolean { return isReflecting; }
function GetHasMirrors() : boolean
{
	return (numReflectionsAllowed-numReflectionsDone) > 0;
}
function GetMirrorPos() : Vector2 { return lineStart; }
function GetMirrorAngle() : float { return mirrorAngle; }

function GetHostCam() : Camera { return hostcam; }

function GetAllKeysGot() { return numKeysGot == numKeys; }

function OnTouchCarrot(carrot:Star)
{
	if( gamestate == 'playing' )
    {
		if( GetAllKeysGot() )
        {
            numCarrotsGot++;

            if( numCarrotsGot == carrotRefs.Count )
            {
                if( tracker != null ) tracker.PostEvent( "beatLevel", ""+currLevId );
                profile.OnBeatLevel(currLevId);
                GetComponent(Connectable).TriggerEvent("OnBeatCurrentLevel");

#if UNITY_EDITOR
                    FadeToEnding();
#else
                if( profile.HasBeatGame() )
                    FadeToEnding();
                else
                    FadeToLevelSelect(false);
#endif
            }
		}
		else
		{
			BroadcastMessage("OnTouchLockedGoal", this, SendMessageOptions.DontRequireReceiver);
		}
	}
}

function OnGetMirror( mirror:Mirror )
{
	if( gamestate == 'playing' )
    {
		numReflectionsAllowed++;
		mirrorCount.OnCountChanged(numReflectionsAllowed - numReflectionsDone);
		GetComponent(Connectable).TriggerEvent("OnGetMirror");
	}
}

//----------------------------------------
//  t is from 0 to 1
//----------------------------------------
function SetFadeAmount( t:float )
{
	// get rid of all this...should just use AlphaHierarchy instead
    /*
	GetComponent(FadeAmount).SetFadeAmount(t);
	mainLight.intensity = t * origLightIntensity;
	levelNumber.GetComponent(GUITextFade).SetFadeAmount(t);

	GetComponent(AlphaHierarchy).SetLocalAlpha(t, true);
    */
}

function FadeToLevelSelect(showTitleCard)
{
    LevelSelect.main.CueToShow(showTitleCard);
    gamestate = 'fadingToLevelSelect';
    FadeCurtains.main.Close();
}

function FadeToEnding()
{
    Ending.main.CueToShow();
    gamestate = 'fadingToEnding';
    FadeCurtains.main.Close();
}

function OnEndingDone()
{
    Utils.Assert( gamestate == "ending" );
    FadeToLevelSelect(false);
}

function OnKeysGotChanged()
{
    for( var carrot:Star in carrotRefs )
    {
        if( carrot != null )
            carrot.SetLocked( !GetAllKeysGot() );
    }
}

function GetCurrentLevelId() { return currLevId; }

private var lastKeyPos:Vector3;

function GetLastKeyPos() { return lastKeyPos; }

function OnGetKey( keyObj:GameObject )
{
	if( gamestate == 'playing' )
    {
        numKeysGot++;

        OnKeysGotChanged();

        if( numKeysGot >= numKeys )
            BroadcastMessage("OnUnlockedGoalByKey", this, SendMessageOptions.DontRequireReceiver);

        keyFx.transform.position = keyObj.transform.position;
        keyFx.SendMessage("Play");

        Destroy(keyObj);

        if( tracker != null )
        {
            var json = new ToStringJsonWriter();
            json.WriteObjectStart();
            json.Write("keyPos", Utils.ToVector2(keyObj.transform.position));
            json.WriteObjectEnd();
            tracker.PostEvent( "gotKey", json.GetString() );
        }

        GetComponent(Connectable).TriggerEvent("OnGetKey");
    }
}

function PolysToStroke( polys:Mesh2D, vmax:float, width:float, buffer:MeshBuffer, mesh:Mesh )
{
    var edgeVisited = new boolean[ polys.GetNumEdges() ];
    for( var eid = 0; eid < edgeVisited.length; eid++ )
        edgeVisited[ eid ] = false;

	// TODO - we're being pretty damn conservative with the number of vertices the final mesh may need..
	buffer.Allocate( 4*polys.GetNumEdges(), 2*polys.GetNumEdges() );
	var nextFreeVert = 0;
	var nextFreeTri = 0;

	while( true )
    {
		// find an unvisited edge
		eid = 0;
		while( eid < edgeVisited.length && edgeVisited[eid] ) eid++;
		if( eid >= edgeVisited.length ) break;

		// find the loop starting at this edge
		var loop = polys.GetEdgeLoop( eid );

		// mark all edges in the loop
		for( var loopEid = 0; loopEid < loop.Count; loopEid++ )
			edgeVisited[ loop[loopEid] ] = true;

		// stroke out the loop
		// reverse the loop, just cuz
		loop.Reverse();

		// get the points of the edge loop to use as control points
		var nControls = loop.Count;
		var loopPts = new Vector2[ nControls ];
		for( loopEid = 0; loopEid < loop.Count; loopEid++ )
        {
			var polysEid = loop[ loopEid ];
			var startPid = polys.edgeA[ polysEid ];
			loopPts[loopEid] = polys.pts[ startPid ];
		}

		// compute simple lerp'd V coordinates
		var texVs = new float[nControls];
		for( var i = 0; i < nControls; i++ )
			texVs[i] = (i*1.0)/(nControls-1.0) * vmax;

		ProGeo.Stroke2D( loopPts, texVs, 0, nControls-1,
				true,
				width, buffer,
				nextFreeVert, nextFreeTri );

		// update
		nextFreeVert += 2*nControls;
		nextFreeTri += 2*nControls;
	}

	// update mesh
    // point at camera
    buffer.SetAllNormals(Vector3(0,0,-1));
	buffer.CopyToMesh( mesh );
	mesh.RecalculateBounds();
}

function OnCollidingGeometryChanged()
{
	// update collision meshes
	ProGeo.BuildBeltMesh(
			currLevPoly.pts, currLevPoly.edgeA, currLevPoly.edgeB,
			-10, 10, false, GetComponent(MeshFilter).mesh );
	GetComponent(DynamicMeshCollider).OnMeshChanged();

	// update rendered fill mesh
	ProGeo.TriangulateSimplePolygon( currLevPoly, mainPolygon.mesh, false );
	mainPolygon.mesh.RecalculateNormals();
	PolysToStroke( currLevPoly, 1.0, mainOutlineWidth, outlineBuffer, mainOutline.mesh );
}

function UpdateConveyorVisuals( conveyors:List.<Mesh2D> )
{
    // just stroke out each edge individually for now..
    // count how many triangles/vertices we'll need
    var numTris = 0;
    var numVerts = 0;
    for( conv in conveyors ) {
        numTris += 2*conv.GetNumEdges();
        numVerts += 4*conv.GetNumEdges();
    }
    conveyorsBuffer.Allocate( numVerts, numTris );

    // build all, appending them to the same mesh buffer
    var lastTri = 0;
    var lastVert = 0;
    for( conv in conveyors ) {
        var dist = 0.0;
        for( var edge = 0; edge < conv.GetNumEdges(); edge++ ) {
            var p1 = conv.GetEdgeStart(edge);
            var p2 = conv.GetEdgeEnd(edge);
            var edgeLen = Vector2.Distance( p1, p2 );
            var w = conveyorsStrokeWidth;
            var texVs = [ dist/w, (dist+edgeLen)/w ];
            var pts = [p1, p2];
            ProGeo.Stroke2D( pts, texVs, 0, 1, false,
                    conveyorsStrokeWidth,
                    conveyorsBuffer, lastVert, lastTri );

            lastTri += 2;
            lastVert += 4;
            dist += edgeLen;
        }
    }

    conveyorsBuffer.CopyToMesh( conveyorsMesh.mesh );
    conveyorsMesh.mesh.RecalculateBounds();
    conveyorsMesh.mesh.RecalculateNormals();
}

//----------------------------------------
//  Sets up the playing level
//----------------------------------------
function InitPlaying( levId:int )
{
	currLevId = levId;
    gamestate = "playing";

    menu.EnterHidden();
    ExitReflectMode();

    player.SetActive(true);
    mainPolygon.gameObject.SetActive(true);
    mainOutline.gameObject.SetActive(true);
    rockPolygon.gameObject.SetActive(true);
    rockOutline.gameObject.SetActive(true);

    flapWidget.SetActive(true);
    mouseMgr.SetActive(true);

    previewPolygon.gameObject.SetActive(false);
	previewOutline.gameObject.SetActive(false);

	levId = Mathf.Clamp( levId, 0, levels.Count-1 );
	
    numReflectionsDone = 0;
    profile.OnPlayingLevel(levId);

	currLevPoly = levels[levId].geo.Duplicate();
	OnCollidingGeometryChanged();

	// update rocks collider
	if( levels[levId].rockGeo.pts != null )
	{
		ProGeo.BuildBeltMesh( levels[levId].rockGeo, -10, 10, true,
				rockCollider.GetMesh() );
		rockCollider.OnMeshChanged();

		// update rock render
		ProGeo.TriangulateSimplePolygon( levels[levId].rockGeo, rockPolygon.mesh, false );
		rockPolygon.mesh.RecalculateNormals();

		// update the outline
		PolysToStroke( levels[levId].rockGeo, 1.0, rockStrokeWidth, rockOutlineBuffer, rockOutline.mesh );
	}
	else
    {
		rockCollider.GetMesh().Clear();
		rockCollider.OnMeshChanged();
		rockPolygon.mesh.Clear();
		rockOutline.mesh.Clear();
	}

    // get conveyors
    currConveyors = new List.<Mesh2D>();
    for( conv in levels[levId].conveyors )
        currConveyors.Add( conv.Duplicate() );
    conveyorsMesh.mesh.Clear();
    UpdateConveyorVisuals( currConveyors );
    convsInst.Reset( currConveyors, conveyorsStrokeWidth/2.0 );

	// position the player
    player.SetActive(true);
	player.transform.position = levels[levId].playerPos;
	player.GetComponent(Rigidbody).velocity = Vector3(0,0,0);
	player.GetComponent(PlayerControl).Reset();

	// move the background to the area's center
	background.transform.position = levels[levId].areaCenter;
	background.transform.position.z = 10;

	// move the safe area
	safeArea.transform.position = levels[levId].areaCenter;
	safeArea.transform.position.z = player.transform.position.z;

	// move camera to see the level
	hostcam.transform.position = Utils.ToVector3( levels[levId].areaCenter, hostcam.transform.position.z );

	//----------------------------------------
	//  Spawn objects
	//----------------------------------------
	
	numKeys = 0;
	objectInsts.Clear();

	// disable the prefabs
	keyPrefab.SetActive(false);
	Utils.HideAll( keyPrefab );
	
	ballKeyPrefab.SetActive(false);
	Utils.HideAll( ballKeyPrefab );
	
	mirrorPrefab.SetActive(false);
	Utils.HideAll( mirrorPrefab );
	
	numReflectionsAllowed = levels[levId].maxReflections;

	if( levId > 0 )
	{
		mirrorCount.gameObject.SetActive(true);
        mirrorCount.Show();
		mirrorCount.OnCountChanged(numReflectionsAllowed);
	}
	
	// spawn all objects
    carrotRefs.Clear();
    carrotPrefab.SetActive(false);

	for( lobj in levels[levId].objects )
    {
		var obj:GameObject = null;

		// spawn key or ballkey
		if( lobj.type == 'key' ) {
			numKeys++;
			obj = Instantiate( keyPrefab, lobj.pos, keyPrefab.transform.rotation );
		}
        else if( lobj.type == 'goal' )
        {
            obj = Instantiate( carrotPrefab, lobj.pos, carrotPrefab.transform.rotation );
            carrotRefs.Add(obj.GetComponent(Star));
        }
		else if( lobj.type == 'ballKey' ) {
			numKeys++;
			obj = Instantiate( ballKeyPrefab, lobj.pos, ballKeyPrefab.transform.rotation );
			obj.GetComponent(Key).playerCollider = player.GetComponent(Collider);
		}
		else if( lobj.type == 'mirror' ) {
			obj = Instantiate( mirrorPrefab, lobj.pos, mirrorPrefab.transform.rotation );
			obj.GetComponent(Mirror).receiver = this.gameObject;
		}
		else
		{
			Debug.LogError('Invalid gameobject type from Inkscape export: '+lobj.type);
		}

		// setup
		obj.transform.parent = this.transform;
		obj.SetActive(true);
		Utils.ShowAll( obj );
		objectInsts.Add( obj );
	}

	// update goal locked state
	numKeysGot = 0;
	OnKeysGotChanged();
    numCarrotsGot = 0;

	// put up correct status text
	levelNumber.text = 'Moment '+(currLevId+1)+ '/'+levels.Count;
	
	if( tracker != null )
		tracker.PostEvent( "startLevel", ""+levId );

	BroadcastMessage("OnLevelChanged", this, SendMessageOptions.DontRequireReceiver);
	GetComponent(Connectable).TriggerEvent("OnLevelChanged");
	GetComponent(Connectable).TriggerEvent("OnEnterPlayingState");
}

function DeinitPlayObjects()
{
    flapWidget.SetActive(false);
    mouseMgr.SetActive(false);

    player.SetActive(false);
    mainPolygon.gameObject.SetActive(false);
    mainOutline.gameObject.SetActive(false);
    rockPolygon.gameObject.SetActive(false);
    rockOutline.gameObject.SetActive(false);
    previewPolygon.gameObject.SetActive(false);
	previewOutline.gameObject.SetActive(false);

	mirrorCount.gameObject.SetActive(false);

    // in case we're in reflect

	if( isReflecting )
		ExitReflectMode();

    if( menu.GetIsActive() )
        menu.EnterHidden();

	for( inst in objectInsts )
		Destroy(inst);
    objectInsts.Clear();
    carrotRefs.Clear();

	GetComponent(Connectable).TriggerEvent("OnExitPlayingState");
}

class CornerFlapWidget extends MouseEventManager.RendererListener
{
    var onHover:GameObject;
    var flap:GameObject;

    function CornerFlapWidget(_flap:GameObject, _onHover:GameObject)
    {
        super(_flap.renderer);
        flap = _flap;
        onHover = _onHover;
    }

    function OnMouseEnter() : void
    {
        onHover.SetActive(true);
    }

    function OnMouseExit() : void
    {
        onHover.SetActive(false);
    }

    function SetActive(active:boolean) : void
    {
        flap.SetActive(active);
        onHover.SetActive(false);
    }
}

private var mouseMgr:MouseEventManager = null;
private var mouseListeners = new List.<MouseEventManager.Listener>();
private var flapWidget:CornerFlapWidget;

function Awake()
{
	if( Singleton != null )
	{
		Debug.LogError( 'Multiple game controllers in scene!' );
		Destroy( this );
	}
	else
	{
		Singleton = this;

		// build from the text file
		var reader = new StringReader( levelsText.text );
		levels = LevelManager.ParseLevels( reader );
		// Truncate to hide last experimental levels
		if( levels.Count > maxNumLevels )
			levels.RemoveRange(maxNumLevels, levels.Count-maxNumLevels);
		Debug.Log('Read in '+levels.Count+' levels');

		origLightIntensity = mainLight.intensity;
	}
	
	rotationSounds.Init();
    convsInst = new Conveyors();

    //----------------------------------------
    //  Init refs
    //----------------------------------------
    var flap = GameObject.Find("cornerMenuFlap");
    var label = GameObject.Find("cornerMenuFlapLabel");
    flapWidget = new CornerFlapWidget( flap, label );
    flapWidget.SetActive(false);

    mouseMgr = new MouseEventManager();
    mouseMgr.SetTargets(mouseListeners);
    mouseListeners.Add(flapWidget);
    mouseMgr.SetActive(false);
}

function Start()
{
	SetFadeAmount( 1 );
	gamestate = 'startscreen';
    DeinitPlayObjects();
    startscreen.SetActive(true);

    Utils.Connect( this, FadeCurtains.main, "OnCurtainsClosed" );
    FadeCurtains.main.Open();
}

function OnCurtainsClosed()
{
    if( gamestate == "cuedLevelStart" )
    {
        InitPlaying(goalLevId);
        FadeCurtains.main.Open();
    }
    else if( gamestate == "fadingToLevelSelect" )
    {
        DeinitPlayObjects();
        startscreen.SetActive(false);
        gamestate = "levelselect";
    }
    else if( gamestate == "fadingToEnding" )
    {
        DeinitPlayObjects();
        gamestate = "ending";
    }
}

function GetMouseXYWorldPos() : Vector2
{
	var ray = hostcam.ScreenPointToRay( Input.mousePosition );
	// solve for when the ray hits z=0 plane
	var alpha = -ray.origin.z / ray.direction.z;
	var mouseWpos = ray.origin + alpha*ray.direction;
	return Utils.ToVector2( mouseWpos );
}

function UpdateMirrorAngle() : void
{
	var maxDelta = previewRotateSpeed * Time.deltaTime;
	if( Mathf.Abs(goalMirrorAngle-mirrorAngle) < maxDelta ) {
		mirrorAngle = goalMirrorAngle;
	}
	else {
		var dir = Mathf.Sign(goalMirrorAngle - mirrorAngle);
		mirrorAngle += maxDelta * dir;
	}
}

function UpdateReflectionLine() : void
{
	var mousePos = GetMouseXYWorldPos();
	goalLineStart = mousePos;

    if( freeMode )
    {
        lineStart = goalLineStart;
    }
    else
    {
        if( snapReflectPosition ) 
        {
            goalLineStart.x = Mathf.Round(2.0*mousePos.x)/2.0;
            goalLineStart.y = Mathf.Round(2.0*mousePos.y)/2.0;
        }

        // move the mirror to this position at some speed
        var delta = goalLineStart - lineStart;
        var dist = delta.magnitude;
        var maxMoveDist = Time.deltaTime * previewTranslateSpeed;
        var maxDistFromGoal = 1.0;
        if( dist < maxMoveDist )
            lineStart = goalLineStart;
        else if( dist > maxDistFromGoal )
            // never lag behind too far
            lineStart = goalLineStart - delta*maxDistFromGoal/dist;
        else
            lineStart += maxMoveDist * delta/dist;
    }

	UpdateMirrorAngle();
	lineEnd = lineStart + Vector2( Mathf.Cos(mirrorAngle), Mathf.Sin(mirrorAngle));

/* Old code which used the mouse end for reflection line end..
	if( snapReflectAngle ) {
		// snap the line end to the closest 45 degree angle
		var delta = lineEnd - lineStart;
		var angle = Mathf.Atan2( delta.y, delta.x );
		var angleStep = Mathf.PI / 4;	// 45 deg
		var snappedAngle = Mathf.Round(angle/angleStep) * angleStep;
		lineEnd = lineStart + Vector2( Mathf.Cos(snappedAngle), Mathf.Sin(snappedAngle) );
	}
	*/
}

function OnPlayerFallout() : void
{
	if( gamestate == 'playing' )
    {
		ResetLevel();
	}
}

class ReflectEventDetails
{
	var mirrorAngle:float;
	var mirrorPos:float[];
	var playerPos:float[];
	
	function ToJson() : String { return JsonMapper.ToJson(this); }
	
	static function CreateToJson( _mirrorAngle:float, _mirrorPos:Vector3, _playerPos:Vector3 ) : String
	{
		var e = new ReflectEventDetails();
		e.mirrorAngle = _mirrorAngle;
		e.mirrorPos = Utils.To2Array(_mirrorPos);
		e.playerPos = Utils.To2Array(_playerPos);
		return e.ToJson();		
	}
};

function CueLevelStart(levId:int)
{
    Utils.Assert( gamestate == "levelselect" );
    gamestate = "cuedLevelStart";
    goalLevId = levId;
}

function EnterReflectMode()
{
	isReflecting = true;
    justEnteredReflecting = true;
	BroadcastMessage("OnEnterReflectMode", this, SendMessageOptions.DontRequireReceiver);
	GetComponent(Connectable).TriggerEvent("OnEnterReflectMode");
}

function ExitReflectMode()
{
	isReflecting = false;
	BroadcastMessage("OnExitReflectMode", this, SendMessageOptions.DontRequireReceiver);
	GetComponent(Connectable).TriggerEvent("OnExitReflectMode");

	mainPolygon.gameObject.SetActive(true);
	mainOutline.gameObject.SetActive(true);
	previewPolygon.gameObject.SetActive(false);
	previewOutline.gameObject.SetActive(false);
}

function OnMenuClosed()
{
    if( gamestate == "menu" )
    {
        mirrorCount.Show();
        gamestate = 'playing';
        mouseMgr.SetActive(true);
        flapWidget.SetActive(true);
    }
}

private function UpdateMenu()
{
    if( gamestate == 'playing' )
    {
        mouseMgr.Update();

        // we only have one listener - so just check if there's any target
        var flapClicked = Input.GetMouseButtonDown(0) && mouseMgr.GetCurrentTarget() != null;

        if( Input.GetButtonDown("Menu") || flapClicked )
        {
            menu.EnterActive();
            mirrorCount.Hide();
            gamestate = 'menu';
            mouseMgr.SetActive(false);
            flapWidget.SetActive(false);
        }
    }
}

function ResetLevel()
{
    if( gamestate == 'playing' || gamestate == 'menu' )
    {
		DeinitPlayObjects();
		InitPlaying( currLevId );
        BroadcastMessage("OnResetLevel", this, SendMessageOptions.DontRequireReceiver);
        if( tracker != null ) tracker.PostEvent( "resetLevel", ""+currLevId );
    }
}


function Update()
{
	
	// handle system-wide keys
	if( Input.GetButtonDown('MuteMusic') )
	{
        GetComponent(Connectable).TriggerEvent("OnToggleMuteMusic");
    }

    if( Input.GetButtonDown('FreeMode') && (profile.HasBeatGame() || isEditor) )
    {
        freeMode = !freeMode;
        mirrorCount.OnCountChanged(numReflectionsAllowed - numReflectionsDone);
        AudioSource.PlayClipAtPoint( freeModeSnd, Camera.main.transform.position );
    }

    UpdateMenu();

	if( gamestate == 'startscreen' )
	{
		// clear the other text objects
		levelNumber.text = '';

		if( Input.GetButtonDown('ReflectToggle') )
        {
            FadeToLevelSelect(true);
        }

#if UNITY_EDITOR
        if( Input.GetButtonDown('Reset') )
            profile.Reset();
#endif
	}
	else if( gamestate == 'playing' )
    {
        if( Input.GetButtonDown('Reset') )
        {
            ResetLevel();
        }
        else if( Input.GetButtonDown('LevelSelect') )
        {
            FadeToLevelSelect(false);
        }
        else if( currLevPoly != null )
        {
            //currLevPoly.DebugDraw( Color.blue, 0.0 );

            if( menu.GetIsActive() )
            {
                // ignore input
            }
            else if( isReflecting )
			{
                if( justEnteredReflecting )
                {
                    mainPolygon.gameObject.SetActive(false);
                    mainOutline.gameObject.SetActive(false);
                    previewPolygon.gameObject.SetActive(true);
                    previewOutline.gameObject.SetActive(true);
                }

				//----------------------------------------
				//  Update visuals
				//----------------------------------------
				if( mirrorPosIcon != null ) {
					mirrorPosIcon.enabled = true;
					mirrorPosIcon.transform.position = lineStart;
				}

				//----------------------------------------
				//  Check for rotation input
				//----------------------------------------
				var wheel = Input.GetAxis("Mouse ScrollWheel");
				if( Input.GetButtonDown('RotateMirrorCW') || wheel < 0 )
                {
                    if( !freeMode )
                        goalMirrorAngle -= Mathf.PI/4;

                    rotationSounds.Play(goalMirrorAngle);
				}
				else if( Input.GetButtonDown('RotateMirrorCCW') || wheel > 0 )
                {
                    if( !freeMode )
                        goalMirrorAngle += Mathf.PI/4;

                    rotationSounds.Play(goalMirrorAngle);
				}

                if( freeMode )
                {
                    var rotSign = (Input.GetButton('RotateMirrorCW') || wheel < 0) ? -1
                        : (Input.GetButton('RotateMirrorCCW') || wheel > 0) ? 1
                        : 0;
                    goalMirrorAngle += rotSign * freeRotateSpeed * Time.deltaTime;
                }

				//----------------------------------------
				//  Animate and draw preview
				//----------------------------------------
				var newShape = currLevPoly.Duplicate();
				UpdateReflectionLine();
				newShape.Reflect( lineStart, lineEnd, false );
				
				// conveyors
				var previewConvs = new List.<Mesh2D>();
				for( conv in currConveyors ) {
						var preview = conv.Duplicate();
						preview.Reflect( lineStart, lineEnd, false, true );
						previewConvs.Add( preview );
				}
				UpdateConveyorVisuals( previewConvs );

				if( debugDrawPolygonOutline ) {
					newShape.DebugDraw( debugColor, debugSecs );
				}

                ProGeo.TriangulateSimplePolygon( newShape, previewPolygon.mesh, false );
                previewPolygon.mesh.RecalculateNormals();

                // debug output all verts..
                if( Input.GetButtonDown('DebugReset') && debugHost != null )
                    debugHost.Reset( newShape, false );

                // update the outline
                PolysToStroke( newShape, 1.0, mainOutlineWidth, previewOutlineBuffer, previewOutline.mesh );

                //----------------------------------------
                //  Check for confirm
                //----------------------------------------
				if( Input.GetButtonDown('ReflectToggle') )
				{
					// confirmed
					AudioSource.PlayClipAtPoint( confirmReflectSnd, hostcam.transform.position );

					// IMPORTANT: make sure we snap to the goal state.
					// Otherwise, it's possible for us the commit the in-motion shape..
					mirrorAngle = goalMirrorAngle;
					lineStart = goalLineStart;
					newShape = currLevPoly.Duplicate();
					UpdateReflectionLine(); // to snap, etc.
					newShape.Reflect( lineStart, lineEnd, false );

					// use new shape
					currLevPoly = newShape;
					OnCollidingGeometryChanged();

					// conveyors
					for( conv in currConveyors ) {
							// this time, we DO mirror orientation!
							conv.Reflect( lineStart, lineEnd, false, true );
					}
					UpdateConveyorVisuals( currConveyors );
					convsInst.Reset( currConveyors, conveyorsStrokeWidth/2.0 );

					// update state
					numReflectionsDone++;
					mirrorCount.OnCountChanged(numReflectionsAllowed-numReflectionsDone);
					ExitReflectMode();

					if( tracker != null )
					{
						var json = new ToStringJsonWriter();
						json.WriteObjectStart();
						json.Write("mirrorAngle", mirrorAngle);
						json.Write("lineStart", Utils.ToVector2(lineStart));
						json.Write("playerPos", Utils.ToVector2(player.transform.position));
						json.WriteObjectEnd();
						tracker.PostEvent( "reflect", json.GetString() );
					}
				}
				else if( Input.GetButtonDown('Cancel'))
				{
					AudioSource.PlayClipAtPoint( cancelReflectSnd, hostcam.transform.position );
					ExitReflectMode();
					UpdateConveyorVisuals( currConveyors );
				}
			}
			else
			{
				if( Input.GetButtonDown('ReflectToggle') )
				{
                    var hasEnough = numReflectionsDone < numReflectionsAllowed;

				#if UNITY_EDITOR
					if( hasEnough || freeMode || debugUnlimited )
				#else
					if( hasEnough || freeMode )
				#endif
					{
						AudioSource.PlayClipAtPoint( startReflectSnd, hostcam.transform.position );
						lineStart = GetMouseXYWorldPos();
						goalLineStart = Vector2(0,0);
						mirrorAngle = Mathf.PI / 2;
						goalMirrorAngle = Mathf.PI / 2;
						EnterReflectMode();
					}
					else
					{
						// no more allowed
						AudioSource.PlayClipAtPoint( maxedReflectionsSnd, hostcam.transform.position );
						mirrorCount.OnNotEnoughError();
					}
				}
			}

		}
	}
}
