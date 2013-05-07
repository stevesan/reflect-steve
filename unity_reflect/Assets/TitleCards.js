#pragma strict

private var group2text = [
"I was lost, but had to keep moving.",
"I was alone, with only myself to rely on.",
"I was not prepared, but who really is?",
"I was moving towards an unknown destination.",
"I could rest, but not for too long.",
"I had a feeling that this was it...",
"...and I think it is. But I can never know."
];

function Start()
{

}

function Update()
{

}

function OnGameScreenShow()
{
	var group = LevelSelect.main.GetCurrentGroup();
	if( group < group2text.length )
		GetComponent(GUIText).text = group2text[group];
}