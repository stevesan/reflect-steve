public static var main:Ending;

private var state = "hidden";

private function Deinit()
{
}

private function Init()
{
    Debug.Log("init");
}

function CueToShow()
{
    if( state == "hidden" )
    {
        state = "cued";
    }
}

function OnCurtainsClosed()
{
    if( state == "cued" )
    {
        Deinit();
        Init();
        state = "shown";
        FadeCurtains.main.Open();
    }
    else if( state == "done" )
    {
        Deinit();
        state = "hidden";
        // game is already cued to take over from here
    }
}

function Awake()
{
    Utils.Assert( main == null );
    main = this;
}

function Start()
{
    Deinit();
    Utils.Connect( this, FadeCurtains.main, "OnCurtainsClosed" );
}


function Update()
{
    if( state == "shown" )
    {
        // When done..
        GameController.Singleton.OnEndingDone();
        state = "done";
    }

}
