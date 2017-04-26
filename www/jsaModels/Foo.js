/* ---------------------------------------------------------------------------------------
This jsaSound Code is distributed under LGPL 3
Copyright (C) 2012 National University of Singapore
Inquiries: director@anclab.org

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3 of the License, or any later version.
This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNULesser General Public License for more details.
You should have received a copy of the GNU General Public License and GNU Lesser General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>
------------------------------------------------------------------------------------------*/

/* --------------------------------------------------------------
	FM with a noise source modulator.
	The index of modulation allows for "faking" narrow-band noise from pure tone to noise. 

	Architecture:
		Gaussian noise Node modulates the frequency of the modulator
******************************************************************************************************
*/
define(
	["jsaSound/jsaSndLib/config", "jsaSound/jsaSndLib/baseSM", "jsaSound/jsaSndLib/jsaOpCodes/nativeNoiseNode", "jsaSound/jsaSndLib/jsaOpCodes/nativeFModOsc", "jsaSound/jsaSndLib/GraphNode"],
	function (config, baseSM, noiseNodeFactory, fmodOscFactory, GraphNode) {
		return function (i_loadedCB) {
			// defined outside "aswNoisyFMInterface" so that they can't be seen be the user of the sound models.
			// They are created here (before they are used) so that methods that set their parameters can be called without referencing undefined objects
			var	noiseModulatorNode = noiseNodeFactory();
			var m_CarrierNode = fmodOscFactory();
			var	gainEnvNode = config.audioContext.createGain();
			var	gainLevelNode = config.audioContext.createGain();

			// these are both defaults for setting up initial values (and displays) but also a way of remembring across the tragic short lifetime of Nodes.
			var m_gainLevel = 0.5;    // the point to (or from) which gainEnvNode ramps glide
			var m_car_freq = 440;
			var m_modIndex = 1.0;
			var m_attackTime = 0.05;
			var m_releaseTime = 1.0;
			var stopTime = 0.0;        // will be > audioContext.currentTime if playing
			var now = 0.0;

			var nodeWrapper; // to connect to a graph node

			// (Re)create the nodes and thier connections.
			// Must be called everytime we want to start playing since nodes are *deleted* when they aren't being used.
			var buildModelArchitecture = (function () {
				// These must be called on every play because of the tragically short lifetime ... however, after the 
				// they have actally been completely deleted - a reference to gainLevelNode, for example, still returns [object AudioGainNode] 
				noiseModulatorNode = noiseNodeFactory();
				m_CarrierNode = fmodOscFactory();
				gainEnvNode = config.audioContext.createGain();
				gainLevelNode = config.audioContext.createGain();

				// Also have to set all of their state values since they all get forgotten, too!!
				gainLevelNode.gain.value = m_gainLevel;
				gainEnvNode.gain.value = 0;

				//This is an opcode. The unified "set" interface is not there for opcodes yet. TODO?
				m_CarrierNode.setParam("modIndex", m_modIndex);

				noiseModulatorNode.connect(m_CarrierNode);
				m_CarrierNode.connect(gainEnvNode);
				gainEnvNode.connect(gainLevelNode);
				
			}());

			var myInterface = baseSM({},[],[gainLevelNode]);
			myInterface.setAboutText("Frequency modulate a tone with noise. Index of modulation is noise amplitude.")


			myInterface.onPlay = function (i_ptime) {
				now = config.audioContext.currentTime;
				gainEnvNode.gain.cancelScheduledValues(now);

				stopTime = config.bigNum;

				// if no input, remember from last time set
				m_car_freq = m_car_freq;
				m_CarrierNode.setParam("carrierFrequency", m_car_freq);
				gainLevelNode.gain.value = m_gainLevel;

				gainEnvNode.gain.setValueAtTime(0, now);
				gainEnvNode.gain.linearRampToValueAtTime(gainLevelNode.gain.value, now + m_attackTime); // go to gain level over .1 secs			
	
			};

			myInterface.registerParam(
				"Carrier Frequency",
				"range",
				{
					"min": 200,
					"max": 2000,
					"val": m_car_freq
				},
				function (i_val) {
					m_car_freq = i_val;
					m_CarrierNode.setParam("carrierFrequency", m_car_freq);
				}
			);

			myInterface.registerParam(
				"Modulation Index",
				"range",
				{
					"min": 0,
					"max": 1000,
					"val": m_modIndex
				},
				function (i_val) {
					m_modIndex = i_val;
					m_CarrierNode.setParam("modIndex", m_modIndex);
				}
			);

			myInterface.registerParam(
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

			myInterface.registerParam(
				"Attack Time",
				"range",
				{
					"min": 0,
					"max": 1,
					"val": m_attackTime
				},
				function (i_val) {
					m_attackTime = parseFloat(i_val);  // javascript makes me cry ....
				}
			);

			myInterface.registerParam(
				"Release Time",
				"range",
				{
					"min": 0,
					"max": 3,
					"val": m_releaseTime
				},
				function (i_val) {
					m_releaseTime = parseFloat(i_val); // javascript makes me cry ....
				}
			);

			myInterface.onRelease = function (i_ptime) {
				now = config.audioContext.currentTime;
				stopTime = now + m_releaseTime;

				gainEnvNode.gain.cancelScheduledValues(now);
				gainEnvNode.gain.setValueAtTime(gainEnvNode.gain.value, now ); 
				gainEnvNode.gain.linearRampToValueAtTime(0, stopTime);
				
				myInterface.schedule(stopTime, function () {
					myInterface.stop();
				});
			};

			//console.log("paramlist = " + myInterface.getParamList().prettyString());	
			i_loadedCB && i_loadedCB(myInterface);				
			return myInterface;
		};
	}
);
