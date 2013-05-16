#pragma strict

private var group2text = [
"I was lost, but had to keep moving.",
"I was alone, with only myself to rely on.",
"I was not prepared, but who really is?",
"I was moving towards an unknown destination.",
"I could rest, but not for too long.",
"I had a feeling that this was it...",
"But will I ever know for sure?"
];

function Start()
{
	GetComponent(GUIText).enabled = false;
}

function Update()
{

}

function OnGameScreenHidden()
{
	GetComponent(GUIText).enabled = false;
}

function OnGameScreenShow()
{
	GetComponent(GUIText).enabled = true;

	var group = LevelSelect.main.GetCurrentGroup();
	if( group < group2text.length )
		GetComponent(GUIText).text = group2text[group] + "\n\n\n(click)";
}