#pragma strict

private var mouseMgr = new MouseEventManager();
private var mouseListeners = new List.<MouseEventManager.Listener>();
var game:GameController = null;
var flapAnim:tk2dAnimatedSprite = null;
var music:MusicManager;
var profile:Profile;
var errorSound:AudioClip;

private var state = "uninit";

private function GetChild(name:String) : GameObject
{
    var t = transform.Find(name);
    return t.gameObject;
}

private function GetItem(name:String) : GUIText
{
    return GetChild(name).GetComponent(GUIText);
}

private class ItemListener extends MouseEventManager.GUITextListener
{
    var origFontSize = 16;

    function ItemListener(text:GUIText)
    {
        super(text);
        origFontSize = text.fontSize;
    }

    function OnMouseEnter() : void
    {
        this.text.fontSize = origFontSize+2;
    }

    function OnMouseExit() : void
    {
        this.text.fontSize = origFontSize;
    }
}

function Start()
{
    mouseMgr.SetTargets(mouseListeners);

    mouseListeners.Add( new ItemListener( GetItem("back") ));
    mouseListeners.Add( new ItemListener( GetItem("credits") ));
    mouseListeners.Add( new ItemListener( GetItem("music") ));
    mouseListeners.Add( new ItemListener( GetItem("reset") ));
    mouseListeners.Add( new ItemListener( GetItem("select") ));
    mouseListeners.Add( new ItemListener( GetItem("skip") ));

    EnterHidden();
}

function EnterActive()
{
    if( state != "active" )
    {
        gameObject.SetActive(true);
        state = "active";
        flapAnim.gameObject.SetActive(true);
        flapAnim.Play();

        var lev = game.GetCurrentLevelId();
        if( profile.CanSkipLevel(lev) )
        {
            GetItem("skip").text = "Skip Level";
        }
        else
        {
            GetItem("skip").text = "(Can't Skip)";
        }
    }
}

function GetIsActive()
{
    return state == "active";
}

function EnterHidden()
{
    if( state != "hidden" )
    {
        state = "hidden";

        for( var listener:ItemListener in mouseListeners )
        {
            listener.OnMouseExit();
        }

        gameObject.SetActive(false);
        flapAnim.gameObject.SetActive(false);

        game.OnMenuClosed();
    }
}

function Update()
{
    if( state == "active" )
    {
        mouseMgr.Update();

        var targetItem = mouseMgr.GetCurrentTarget() as ItemListener;

        if( Input.GetMouseButtonDown(0) && targetItem )
        {
            var clickedName = targetItem.text.gameObject.name;

            if( clickedName == "back" )
            {
                EnterHidden();
            }
            else if( clickedName == "music" )
            {
                music.OnToggleMuteMusic();
            }
            else if( clickedName == "reset" )
            {
                game.ResetLevel();
            }
            else if( clickedName == "select" )
            {
                game.FadeToLevelSelect(false);
            }
            else if( clickedName == "skip" )
            {
                if( profile.CanSkipLevel(game.GetCurrentLevelId()) )
                {
                    profile.OnSkipLevel(game.GetCurrentLevelId());
                    game.FadeToLevelSelect(false);
                }
                else
                {
                    AudioSource.PlayClipAtPoint( errorSound, Camera.main.transform.position );
                }
            }
        }
        else if( Input.GetButtonDown("Menu") )
        {
            EnterHidden();
        }
    }
}
