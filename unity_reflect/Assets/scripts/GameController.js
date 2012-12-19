#pragma strict

import System.IO;
import System.Text;

static var Singleton : GameController = null;

var hostcam : Camera;
var snapReflectAngle = true;
var snapReflectPosition = true;

// Controls how fast the preview spins
private var previewRotateSpeed = 1.5*Mathf.PI;
private var previewTranslateSpeed = 100.0;

//----------------------------------------
//  Components instances we use
//----------------------------------------
var tracker:Tracking = null;

//----------------------------------------
//  Prefabs/Puppet-objects
//----------------------------------------
var helpText : GUIText;
var levelNumber : GUIText;
var titleText : GUIText;
var level0Tute : GUIText;
var level0TuteB : GUIText;
var level1TuteA : GUIText;
var level1TuteB : GUIText;
var level4Tute : GUIText;

var player : GameObject;
var goal : GameObject;
var keyPrefab : GameObject;
var keyFx : GameObject;
var ballKeyPrefab : GameObject;
var mirrorPrefab : GameObject = null;
var background : GameObject;
var safeArea : SafeArea;

//----------------------------------------
//  Objects for level geometry/UI
//----------------------------------------
var reverseLevelCollision : DynamicMeshCollider;
var geoTriRender : MeshFilter;	// rendering the fill-triangles for the active collision geometry
var rockCollider : DynamicMeshCollider;
var rockRender : MeshFilter;
var previewTriRender : MeshFilter;	// rendering the fill-triangles of the preview
var debugHost:DebugTriangulate = null;

var mirrorPosIcon : Renderer;

var outlineMesh : MeshFilter;
var outlineWidth  = 0.5;
private var outlineBuffer = new MeshBuffer();

var rockOutlineMesh : MeshFilter;
var rockStrokeWidth = 0.5;
private var rockOutlineBuffer = new MeshBuffer();

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
private var fadeStart : float;

//----------------------------------------
//  Assets
//----------------------------------------
var levelsText : TextAsset;

// Use this to hide levels not ready for prime time..
#if UNITY_EDITOR
private var maxNumLevels = 23;
#else
private var maxNumLevels = 23;
#endif

//----------------------------------------
//  Sounds
//----------------------------------------
var goalGetSound : AudioClip = null;
var restartSnd : AudioClip = null;
var startReflectSnd : AudioClip = null;
var cancelReflectSnd : AudioClip = null;
var confirmReflectSnd : AudioClip = null;
var goalLockedSound: AudioClip = null;
var maxedReflectionsSnd: AudioClip = null;

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
	
	function Play(rads:float) {
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
//  Particle FX
//----------------------------------------
var goalGetFx : ParticleSystem;

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

//----------------------------------------
//  Per-level state
//----------------------------------------
private var numKeysGot = 0;
private var numKeys = 0;
private var objectInsts = new Array();

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
private var numReflectionsDone = 0;
private var numReflectionsAllowed = 0;
private var lineStart = Vector2(0,0);
private var goalLineStart = Vector2(0,0);
private var lineEnd = Vector2(0,0);
private var mirrorAngle = 0.0;
private var goalMirrorAngle = 0.0;

function GetLevel() : LevelInfo { return levels[currLevId]; }

function GetIsReflecting() : boolean { return isReflecting; }
function GetMirrorPos() : Vector2 { return lineStart; }
function GetMirrorAngle() : float { return mirrorAngle; }

function OnGetGoal()
{
	if( gamestate == 'playing' ) {
		if( numKeysGot == numKeys ) {
			if( tracker != null )
				tracker.PostEvent( "beatLevel", ""+currLevId );

			FadeToLevel( (currLevId+1) % levels.Count, false );
			goal.GetComponent(Star).SetShown( false );

			// fireworks
			AudioSource.PlayClipAtPoint( goalGetSound, hostcam.transform.position );
			goalGetFx.transform.position = goal.transform.position;
			goalGetFx.Play();
		}
		else
		{
			AudioSource.PlayClipAtPoint( goalLockedSound, hostcam.transform.position );
			BroadcastMessage("OnTouchLockedGoal", this, SendMessageOptions.DontRequireReceiver);
		}
	}
}

function OnGetMirror( mirror:Mirror )
{
	if( gamestate == 'playing' ) {
		numReflectionsAllowed++;
		helpText.GetComponent(PositionAnimation).Play();
	}
}

//----------------------------------------
//  t is from 0 to 1
//----------------------------------------
function SetFadeAmount( t:float ) {
	GetComponent(FadeAmount).SetFadeAmount(t);
	mainLight.intensity = t * origLightIntensity;
	levelNumber.GetComponent(GUITextFade).SetFadeAmount(t);
	helpText.GetComponent(GUITextFade).SetFadeAmount(t);
}

function FadeToLevel( levId:int, fast:boolean ) {
	// fade into next level
	gamestate = 'fadingOut';
	fadeStart = Time.time;
	goalLevId = levId;
	doFastFade = fast;
}

function UpdateGoalLocked()
{
Debug.Log("updating goal lock state, "+numKeysGot+" / " +numKeys);
	goal.GetComponent(Star).SetLocked( numKeysGot < numKeys );
}

function GetCurrentLevelId() { return currLevId; }

private var lastKeyPos:Vector3;

function GetLastKeyPos() { return lastKeyPos; }

function OnGetKey( keyObj:GameObject )
{
	numKeysGot++;
	UpdateGoalLocked();
	
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

function PolysToStroke( polys:Mesh2D, vmax:float, width:float, buffer:MeshBuffer, mesh:Mesh )
{
	var edgeVisited = new boolean[ polys.GetNumEdges() ];
	for( var eid = 0; eid < edgeVisited.length; eid++ ) {
		edgeVisited[ eid ] = false;
	}

	// TODO - we're being pretty damn conservative with the number of vertices the final mesh may need..
	buffer.Allocate( 4*polys.GetNumEdges(), 2*polys.GetNumEdges() );
	var nextFreeVert = 0;
	var nextFreeTri = 0;

	while( true ) {

		// find an unvisited edge
		eid = 0;
		while( eid < edgeVisited.length && edgeVisited[eid] ) eid++;
		if( eid >= edgeVisited.length ) break;

		// find the loop starting at this edge
		var loop = polys.GetEdgeLoop( eid );

		// mark all edges in the loop
		for( var loopEid = 0; loopEid < loop.Count; loopEid++ ) {
			edgeVisited[ loop[loopEid] ] = true;
		}

		// stroke out the loop
		// reverse the loop, just cuz
		loop.Reverse();

		// get the points of the edge loop to use as control points
		var nControls = loop.Count;
		var loopPts = new Vector2[ nControls ];
		for( loopEid = 0; loopEid < loop.Count; loopEid++ ) {
			var polysEid = loop[ loopEid ];
			var startPid = polys.edgeA[ polysEid ];
			loopPts[loopEid] = polys.pts[ startPid ];
		}

		// compute simple lerp'd V coordinates
		var texVs = new float[nControls];
		for( var i = 0; i < nControls; i++ ) {
			texVs[i] = (i*1.0)/(nControls-1.0) * vmax;
		}

		ProGeo.Stroke2D( loopPts, texVs, 0, nControls-1,
				true,
				width, buffer,
				nextFreeVert, nextFreeTri );

		// update
		nextFreeVert += 2*nControls;
		nextFreeTri += 2*nControls;
	}

	// update mesh
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

	// Make it double-sided
	var reverse = reverseLevelCollision;
	if( reverse != null )
	{
		reverse.GetMesh().Clear();
		ProGeo.BuildBeltMesh(
				currLevPoly.pts, currLevPoly.edgeA, currLevPoly.edgeB,
				-10, 10, true, reverse.GetMesh() );
		reverse.OnMeshChanged();
	}

	// update rendered fill mesh
	if( geoTriRender != null ) {
		ProGeo.TriangulateSimplePolygon( currLevPoly, geoTriRender.mesh, false );
		SetNormalsAtCamera( geoTriRender.mesh );

		// update the outline
		PolysToStroke( currLevPoly, 1.0, outlineWidth, outlineBuffer, outlineMesh.mesh );
		SetNormalsAtCamera( outlineMesh.mesh );
	}
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
    SetNormalsAtCamera( conveyorsMesh.mesh );
}


function SwitchLevel( id:int )
{
	id = Mathf.Min( id, levels.Count-1 );
	Debug.Log('switching to level '+id);
	
    if( isReflecting ) {
	    isReflecting = false;
	    BroadcastMessage("OnExitReflectMode", this, SendMessageOptions.DontRequireReceiver);
        GetComponent(Connectable).TriggerEvent("OnExitReflectMode");
    }
	numReflectionsDone = 0;
	currLevId = id;
	PlayerPrefs.SetInt("currentLevelId", id);

	currLevPoly = levels[id].geo.Duplicate();
	OnCollidingGeometryChanged();

	// update rocks collider
	if( levels[id].rockGeo.pts != null ) {
		ProGeo.BuildBeltMesh( levels[id].rockGeo, -10, 10, true,
				rockCollider.GetMesh() );
		rockCollider.OnMeshChanged();

		// update rock render
		ProGeo.TriangulateSimplePolygon( levels[id].rockGeo, rockRender.mesh, false );
		SetNormalsAtCamera( rockRender.mesh );

		// update the outline
		PolysToStroke( levels[id].rockGeo, 1.0, rockStrokeWidth, rockOutlineBuffer, rockOutlineMesh.mesh );
		SetNormalsAtCamera( rockOutlineMesh.mesh );
	}
	else {
		rockCollider.GetMesh().Clear();
		rockCollider.OnMeshChanged();
		rockRender.mesh.Clear();

		// outline
		rockOutlineMesh.mesh.Clear();
	}

    // get conveyors
    currConveyors = new List.<Mesh2D>();
    for( conv in levels[id].conveyors ) {
        currConveyors.Add( conv.Duplicate() );
    }
    conveyorsMesh.mesh.Clear();
    UpdateConveyorVisuals( currConveyors );
    convsInst.Reset( currConveyors, conveyorsStrokeWidth/2.0 );

	// position the player
	player.transform.position = levels[id].playerPos;
	player.GetComponent(Rigidbody).velocity = Vector3(0,0,0);
	player.GetComponent(PlayerControl).Reset();
	goal.transform.position = levels[id].goalPos;
	goal.GetComponent(Star).SetShown( true );

	// move the background to the area's center
	background.transform.position = levels[id].areaCenter;
	background.transform.position.z = 10;

	// move the safe area
	safeArea.transform.position = levels[id].areaCenter;
	safeArea.transform.position.z = player.transform.position.z;

	// move camera to see the level
	hostcam.transform.position = Utils.ToVector3( levels[id].areaCenter, hostcam.transform.position.z );

	//Debug.Log('spawned player at '+player.transform.position);
	//Debug.Log('level area center at '+levels[id].areaCenter);

	//----------------------------------------
	//  Spawn objects
	//----------------------------------------
	
	numKeysGot = 0;
	numKeys = 0;
	for( inst in objectInsts )
		Destroy(inst);
	objectInsts.Clear();

	// disable the prefabs
	keyPrefab.active = false;
	Utils.HideAll( keyPrefab );
	
	ballKeyPrefab.active = false;
	Utils.HideAll( ballKeyPrefab );
	
	mirrorPrefab.active = false;
	Utils.HideAll( mirrorPrefab );
	
	numReflectionsAllowed = levels[id].maxReflections;
	
	// spawn all objects

	for( lobj in levels[id].objects ) {
		var obj:GameObject = null;

		// spawn key or ballkey
		if( lobj.type == 'key' ) {
			numKeys++;
			obj = Instantiate( keyPrefab, lobj.pos, keyPrefab.transform.rotation );
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
		else {
		Debug.LogError('Invalid gameobject type from Inkscape export: '+lobj.type);
		}

		// setup
		obj.transform.parent = this.transform;
		obj.active = true;
		Utils.ShowAll( obj );
		objectInsts.Push( obj );
		Debug.Log('spawned '+lobj.type+' at '+lobj.pos);
	}

	// update goal locked state
	UpdateGoalLocked();

	// put up correct status text
	levelNumber.text = 'Moment '+(currLevId+1)+ '/'+levels.Count;
	
	if( tracker != null )
		tracker.PostEvent( "startLevel", ""+id );
}

function Awake()
{
	if( Singleton != null )
	{
		Debug.LogError( 'Multiple game controllers in scene!' );
		Destroy( this );
	}
	else
	{
		Singleton = this.GetComponent(GameController);

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
}

function Start()
{
	SetFadeAmount( 0 );
	fadeStart = Time.time;
	gamestate = 'startscreen';
}

function UpdateCollisionMesh()
{
}

function SetNormalsAtCamera( mesh:Mesh )
{
	mesh.RecalculateNormals();
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

	//if( goalMirrorAngle < 0 ) goalMirrorAngle += Mathf.PI;
	//if( goalMirrorAngle >= Mathf.PI ) goalMirrorAngle -= Mathf.PI;
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
	if( gamestate == 'playing' ) {
		// reset
		if( restartSnd != null )
			AudioSource.PlayClipAtPoint( restartSnd, hostcam.transform.position );
		FadeToLevel( currLevId, false );
		previewTriRender.gameObject.GetComponent(Renderer).enabled = false;
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

function Update()
{
	level0Tute.enabled = false;
	level0TuteB.enabled = false;
	level1TuteA.enabled = false;
	level1TuteB.enabled = false;
	level4Tute.enabled = false;
	helpText.text = "";
	
	// handle system-wide keys
	if( Input.GetButtonDown('MuteMusic') )
	{
		BroadcastMessage( "OnToggleMuteMusic", SendMessageOptions.DontRequireReceiver );
	}

	if( gamestate == 'startscreen' ) {
		// fading in
		var alpha = Mathf.Clamp( (Time.time-fadeStart) / 10.0, 0.0, 1.0 );
		//SetFadeAmount( alpha );
		SetFadeAmount(1.0);

		// clear the other text objects
		levelNumber.text = '';

		if( Input.GetButtonDown('ReflectToggle') || Input.GetButtonDown('NextLevel') ) {
			FadeToLevel( Mathf.Min( maxNumLevels-1, PlayerPrefs.GetInt("currentLevelId", 0)), true );
			if( restartSnd != null )
				AudioSource.PlayClipAtPoint( restartSnd, hostcam.transform.position );
			Destroy(titleText);
		}
	}
	else if( gamestate == 'fadingOut' ) {
		var outTime = (doFastFade ? fastFadeOutTime : fadeOutTime);
		alpha = Mathf.Clamp( (Time.time-fadeStart) / outTime, 0.0, 1.0 );
		SetFadeAmount( 1-alpha );

		if( alpha >= 1.0 ) {
			// done fading
			gamestate = 'fadedOut';
		}
	}
	else if( gamestate == 'fadedOut' ) {
		// do the actual level switch
		SwitchLevel( goalLevId );

		// and fade in, but game is playable now
		fadeStart = Time.time;
		gamestate = 'playing';
		BroadcastMessage("OnLevelChanged", this, SendMessageOptions.DontRequireReceiver);
	}
	else if( gamestate == 'playing' ) {
		// fade in initially - just keep updating this
		var inTime = (doFastFade ? fastFadeInTime : fadeInTime);
		alpha = Mathf.Clamp( (Time.time-fadeStart) / inTime, 0.0, 1.0 );
		SetFadeAmount( alpha );

		level0Tute.enabled = (currLevId == 0);
		level0TuteB.enabled = (currLevId == 0);
		level1TuteA.enabled = currLevId == 1
			&& (numReflectionsAllowed-numReflectionsDone > 0)
			&& !isReflecting;
		level1TuteB.enabled = currLevId == 1
			&& isReflecting;
		level4Tute.enabled = currLevId == 3
			&& isReflecting;

		if( currLevId != 0 ) {
			helpText.text =  "x"+(numReflectionsAllowed-numReflectionsDone);
		} else {
			helpText.text = "";
		}

		if( currLevPoly != null )
		{
			//currLevPoly.DebugDraw( Color.blue, 0.0 );

			if( Input.GetButtonDown('Reset') )
			{
				if( restartSnd != null )
					AudioSource.PlayClipAtPoint( restartSnd, hostcam.transform.position );
				FadeToLevel( currLevId, true );
				previewTriRender.gameObject.GetComponent(Renderer).enabled = false;
				
				BroadcastMessage("OnResetLevel", this, SendMessageOptions.DontRequireReceiver);

				if( tracker != null )
					tracker.PostEvent( "resetLevel", ""+currLevId );
			}
			else if( Input.GetButtonDown('NextLevel') ) {
				FadeToLevel( (currLevId+1)%levels.Count, true );
				previewTriRender.gameObject.GetComponent(Renderer).enabled = false;
				BroadcastMessage("OnLevelChanged", this, SendMessageOptions.DontRequireReceiver);
			}
			else if( Input.GetButtonDown('PrevLevel') ) {
				FadeToLevel( (levels.Count+currLevId-1)%levels.Count, true );
				previewTriRender.gameObject.GetComponent(Renderer).enabled = false;
				BroadcastMessage("OnLevelChanged", this, SendMessageOptions.DontRequireReceiver);
			}
			else if( isReflecting )
			{
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
				if( Input.GetButtonDown('RotateMirrorCW') || wheel < 0 ) {
					goalMirrorAngle -= Mathf.PI/4;
					rotationSounds.Play(goalMirrorAngle);
				}
				else if( Input.GetButtonDown('RotateMirrorCCW') || wheel > 0 ) {
					goalMirrorAngle += Mathf.PI/4;
					rotationSounds.Play(goalMirrorAngle);
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

				if( previewTriRender != null ) {
					ProGeo.TriangulateSimplePolygon( newShape, previewTriRender.mesh, false );
					SetNormalsAtCamera( previewTriRender.mesh );

					// debug output all verts..
					if( Input.GetButtonDown('DebugReset') && debugHost != null ) {
						debugHost.Reset( newShape, false );
					}
				}

				// we done?
				if( Input.GetButtonDown('ReflectToggle') )
				{
					// confirmed
					AudioSource.PlayClipAtPoint( confirmReflectSnd, hostcam.transform.position );

					// IMPORTANT: make sure we snap to the 45-degree increments.
					// Otherwise, it's possible for us the commit the in-motion shape..
					mirrorAngle = goalMirrorAngle;
					lineStart = goalLineStart;
					newShape = currLevPoly.Duplicate();
					UpdateReflectionLine();
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
					helpText.GetComponent(PositionAnimation).Play();
					isReflecting = false;
					BroadcastMessage("OnExitReflectMode", this, SendMessageOptions.DontRequireReceiver);
                    GetComponent(Connectable).TriggerEvent("OnExitReflectMode");

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
					isReflecting = false;
					BroadcastMessage("OnExitReflectMode", this, SendMessageOptions.DontRequireReceiver);
                    GetComponent(Connectable).TriggerEvent("OnExitReflectMode");
					UpdateConveyorVisuals( currConveyors );
				}
			}
			else {

				if( Input.GetButtonDown('ReflectToggle') )
				{
					if( numReflectionsDone >= numReflectionsAllowed && !debugUnlimited )
					{
						// no more allowed
						AudioSource.PlayClipAtPoint( maxedReflectionsSnd, hostcam.transform.position );
						helpText.GetComponent(PositionAnimation).Play();
					}
					else
					{
						AudioSource.PlayClipAtPoint( startReflectSnd, hostcam.transform.position );
						lineStart = GetMouseXYWorldPos();
						goalLineStart = Vector2(0,0);
						isReflecting = true;
						mirrorAngle = Mathf.PI / 2;
						goalMirrorAngle = Mathf.PI / 2;
						
						BroadcastMessage("OnEnterReflectMode", this, SendMessageOptions.DontRequireReceiver);
                        GetComponent(Connectable).TriggerEvent("OnEnterReflectMode");
					}
				}
			}

		}
	}
}
