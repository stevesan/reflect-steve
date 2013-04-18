#pragma strict
import System.Collections.Generic; // for List
import System.IO;
import System.Xml;
// Pretty specific code for Mark's reflection music concept

var configXml:TextAsset;
var debugText:GUIText;
var reverb:GameObject;

class FadeableSource
{
	var attack:float;
	var release:float;
	var state = "sustain";
	var level:float;
	var maxVolume:float;
	var src:AudioSource;
	var stopOnFadeOut:boolean;
	
	function FadeableSource( _src:AudioSource, _attack:float, _release:float, _maxVolume:float ) {
		attack = _attack;
		release = _release;
		src = _src;
		maxVolume = _maxVolume;
		level = 0.0;
	}
	
	function Play() {
		src.Play();
	}
	
	function SetMaxVolume( _max:float ) { maxVolume = _max; }
	
	function SetStopOnFadeOut( val:boolean ) { stopOnFadeOut = val; }

	function SetLevel(_lev:float) { level = _lev; }
	
	function FadeIn() {
		state = "attack";
	}
	
	function FadeOut() {
		state = "release";
	}
	
	function Stop() {
		src.Stop();
	}

	function GetLevel():float { return level; }
	
	function Update( dt:float ) {
		if( state == "attack" ) {
			if( attack <= 0.0 ) level = 1.0;
			else level += dt/attack;
			if( level >= 1.0 ) {
				state = "sustain";
				level = 1.0;
			}
		}
		else if( state == "release" ) {
			if( release <= 0 ) level = 0.0;
			else level -= dt/release;
			if( level <= 0.0 ) {
				state = "stopped";
				level = 0.0;
				
				if( stopOnFadeOut )
					src.Stop();
			}
		}
		src.volume = level * maxVolume;
	}
}

class MusicClip
{
	var normal:FadeableSource;
	var fx:FadeableSource;
	var isMuted:boolean;

static var allMaxVolume = 1.0;
static var allAttackTime = 2.0;
static var allReleaseTime = 2.0;
	
	function MusicClip()
	{
		isMuted = false;
	}
	
	function ReadXML( node:XmlReader, parent:Transform )
	{
		if( node == null ) return;
		
		var normalClip = Resources.Load(node.GetAttribute("normal")) as AudioClip;
		if( normalClip == null )
			Debug.LogError("Could not load "+node.GetAttribute("normal"));
        else
        {
            var obj = new GameObject();
			obj.transform.parent = parent;
			obj.transform.localPosition = Vector3(0,0,0);
			obj.name = "normalClip";
            var src = obj.AddComponent(AudioSource);
            src.clip = normalClip;
            src.loop = true;
            normal = new FadeableSource(src, allAttackTime, allReleaseTime, allMaxVolume);
        }
		
		/*
		var fxClip = Resources.Load(node.GetAttribute("fx")) as AudioClip;
		if( fxClip == null )
			Debug.LogError("Could not load "+node.GetAttribute("fx"));
        else
        {
            obj = new GameObject();
			obj.transform.parent = parent;
			obj.transform.localPosition = Vector3(0,0,0);
			obj.name = "fxClip";
            src = obj.AddComponent(AudioSource);
            src.clip = fxClip;
            src.loop = true;
            fx = new FadeableSource(src, allAttackTime, allReleaseTime, allMaxVolume );
        }
		*/
	}
	
	function OnLevelStart()
	{
		normal.Play();
		normal.SetLevel(0.0);
		normal.FadeIn();
		normal.SetStopOnFadeOut(false);
		
		/*
		fx.Play();
		fx.SetLevel(0.0);
		fx.SetStopOnFadeOut(false);
		*/
	}
	
	function OnLevelEnd()
	{
		normal.FadeOut();
		normal.SetStopOnFadeOut(true);
		/*
		fx.FadeOut();
		fx.SetStopOnFadeOut(true);
		*/
	}
	
	function Update(dt:float)
	{
		normal.Update(dt);
		//fx.Update(dt);
	}
	
	function SetUseFX( useFX:boolean ) {
		if( useFX ) {
			normal.FadeOut();
			fx.FadeIn();
		}
		else {
			fx.FadeOut();
			normal.FadeIn();
		}
	}
	
	function OnIsMutedChanged()
	{
		var maxVol = (isMuted ? 0.0 : 1.0);
		normal.SetMaxVolume(maxVol);
		//fx.SetMaxVolume(maxVol);
	}
	
	function ToggleIsMuted()
	{
		isMuted = !isMuted;
		OnIsMutedChanged();
	}
}

class ClipGroup
{
	var clips = new List.<MusicClip>();

	function ReadXML( node:XmlReader, parent:Transform )
	{
		while( node.ReadToFollowing("clip") ) {
			var clip = new MusicClip();
			clip.ReadXML(node, parent);
			clips.Add(clip);
			
			//TEMP
			break;
		}
	}
	
	function OnLevelStart()
	{
		for( var clip:MusicClip in clips ) {
			clip.OnLevelStart();
		}
	}
	
	function OnLevelEnd()
	{
		for( var clip:MusicClip in clips ) {
			clip.OnLevelEnd();
		}
	}
	
	function SetUseFX(useFX:boolean) {
		for( var clip:MusicClip in clips ) {
			clip.SetUseFX(useFX);
		}
	}
	
	function Update(dt:float) {
		for( var clip:MusicClip in clips ) {
			clip.Update(dt);
		}		
	}
	
	function ToggleIsMuted()
	{
		for( var clip:MusicClip in clips ) {
			clip.ToggleIsMuted();
		}		
	}
}

private var groups = new List.<ClipGroup>();
private var currGroup = -1;

function Start ()
{
	var reader = XmlReader.Create( new StringReader( configXml.text ) );
	while( reader.ReadToFollowing( 'group' ) )
	{
		var newGroup = new ClipGroup();
		newGroup.ReadXML( reader, this.transform );
		groups.Add(newGroup);
	}
	
	// immediately play group 0
	groups[0].OnLevelStart();
	currGroup = 0;

	reverb.SetActive(false);
}

function Update () {
	for( var group in groups ) {
		group.Update(Time.deltaTime);
	}
}


function OnLevelChanged( game:GameObject )
{
	var newLevId:int = game.GetComponent(GameController).GetCurrentLevelId();
	var newGroup = newLevId % groups.Count;
	Debug.Log("new lev = " + newLevId + " new group = "+newGroup);
	if( newGroup >= groups.Count ) newGroup = groups.Count-1;
	if( newGroup != currGroup ) {
		if( currGroup != -1 )
			groups[currGroup].OnLevelEnd();
		currGroup = newGroup;
		groups[currGroup].OnLevelStart();
		Debug.Log("Starting group "+currGroup);
	}

	debugText.text = "group "+currGroup + "/"+groups.Count;
}

function OnEnterReflectMode( game:GameObject )
{
	//groups[currGroup].SetUseFX(true);
	reverb.SetActive(true);
}

function OnExitReflectMode( game:GameObject )
{
	//groups[currGroup].SetUseFX(false);
	reverb.SetActive(false);

	// TODO move reverber slowly towards this, to gradually incrase reverb to max
}

function OnToggleMuteMusic()
{
	for( var group in groups ) {
		group.ToggleIsMuted();
	}
}
