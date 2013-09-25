/* ---------------------------------------------------------------------------------------
This jsaSound Code is distributed under LGPL 3
Copyright (C) 2012 National University of Singapore
Inquiries: director@anclab.org

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3 of the License, or any later version.
This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNULesser General Public License for more details.
You should have received a copy of the GNU General Public License and GNU Lesser General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>
------------------------------------------------------------------------------------------*/

define(
	["jsaSound/jsaCore/config", "jsaSound/jsaCore/baseSM", "jsaSound/jsaModels/jsaFilteredNoiseBand",  "jsaSound/jsaCore/utils"],
	function (config, baseSM, childFactory, voiceData, utils) {
		return function () {

			m_Position=0;

			var childNode;
			var	gainLevelNode = config.audioContext.createGainNode();

		
			// these are both defaults for setting up initial values (and displays) but also a way of remembring across the tragic short lifetime of Nodes.
			var m_gainLevel = 1, // the point to (or from) which gainEnvNode ramps glide
				stopTime = 0.0,	// will be > audioContext.currentTime if playing
				now = 0.0;


			// define the PUBLIC INTERFACE for the model	
			var myInterface = baseSM({},[],[gainLevelNode]);
			myInterface.setAboutText("To swish, PLAY then move Position");


			// Create the nodes and thier connections. Runs once on load
			var buildModelArchitecture = (function () {
				childNode = childFactory();
				gainLevelNode.gain.value = m_gainLevel;
				childNode.connect(gainLevelNode);
			}());


			// ----------------------------------------
			myInterface.play = function (i_gain) {
				now = config.audioContext.currentTime;
				// The rest of the code is for new starts or restarts	
				stopTime = config.bigNum;

				// if no input, remember from last time set
				gainLevelNode.gain.value = i_gain || m_gainLevel;

				if (myInterface.getNumOutConnections() === 0){
					myInterface.connect(config.audioContext.destination);
				}

				// Initial Values
				childNode.setParam("Filter Q", 30);
				childNode.setParam("Center Frequency", 2000);
				childNode.setParam("Attack Time", .5);
				childNode.setParam("Release Time", 1);
				childNode.setParamNorm("Gain", .0);

				childNode.play();
			};

	
			myInterface.setPosition = myInterface.registerParam(
				"Position",
				"range",
				{
					"min": 0,
					"max": 1,
					"val": m_Position
				},
				function (i_val) {
					m_Position=i_val;
					childNode.setParam("Center Frequency", 2000*(1-m_Position));
					childNode.setParam("Filter Q", 2*Math.abs(.5-m_Position)*30);
					childNode.setParamNorm("Gain", 1-2*Math.abs(.5-m_Position));
				}
			);

			myInterface.registerChildParam(childNode, "Attack Time");
			myInterface.registerChildParam(childNode, "Release Time");

			// ----------------------------------------		
			myInterface.setGain = myInterface.registerParam(
				"Gain",
				"range",
				{
					"min": 0,
					"max": 1,
					"val": m_gainLevel
				},
				function (i_val) {
					gainLevelNode.gain.value = m_gainLevel = i_val;
				}
			);



			// ----------------------------------------
			myInterface.release = function () {
				childNode.release(); 
			};
			//--------------------------------------------------------------------------------
			// Other methods for the interface
			//----------------------------------------------------------------------------------

				
			return myInterface;
		};
	}
);