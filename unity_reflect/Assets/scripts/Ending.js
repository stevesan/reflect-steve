import System.Collections.Generic;

public static var main:Ending;

public var slides = new List.<Texture>();
public var scrollSpeed = 0.02f;
public var zoomSpeed = 0.01f;
public var music:AudioSource;
public var debugRush = false;

private var scrollDir:Vector3;
private var origPosition:Vector3;

private var state = "hidden";

private function Play()
{
#if UNITY_EDITOR
    if( debugRush )
        Time.timeScale = 8.0;
#endif

    MusicManager.main.FadeOut();
    yield WaitForSeconds(3.0);

    music.Play();

    for( var i = 0; i < slides.Count; i++ )
    {
        // New slide
        FadeCurtains.main.Open();
        guiTexture.texture = slides[i];
        transform.localScale = Vector3(1,1,1);
        transform.position = origPosition;
        scrollDir = Vector3( Random.value-0.5, Random.value-0.5, Random.value-0.5 ).normalized;

        yield WaitForSeconds(60.0/84.0 * 12.0 - 1.0);

        // Close and wait
        FadeCurtains.main.Close();
        yield WaitForSeconds(1.0);
    }

    Hide();
    yield WaitForSeconds(3.0);
    state = "hidden";
    GameController.Singleton.OnEndingDone();
}

function CueToShow()
{
    if( state == "hidden" )
    {
        state = "cued";
    }
}

function Hide()
{
    Debug.Log("hide called!");
    guiTexture.texture = null;
    music.Stop();
}

function OnCurtainsClosed()
{
    if( state == "cued" )
    {
        Play(); // co-routine kick off
        state = "shown";
    }
}

function Awake()
{
    Utils.Assert( main == null );
    main = this;
    origPosition = transform.position;
}

function Start()
{
    Utils.Connect( this, FadeCurtains.main, "OnCurtainsClosed" );
    Hide();
}

function Update()
{
    if( state == "shown" )
    {
        transform.position += Time.deltaTime * scrollDir*scrollSpeed;
        transform.localScale += Time.deltaTime * Vector3(zoomSpeed, zoomSpeed, zoomSpeed);
    }
}
