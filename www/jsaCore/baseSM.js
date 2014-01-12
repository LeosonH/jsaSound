/* ---------------------------------------------------------------------------------------
This jsaSound Code is distributed under LGPL 3
Copyright (C) 2012 National University of Singapore
Inquiries: director@anclab.org

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3 of the License, or any later version.
This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNULesser General Public License for more details.
You should have received a copy of the GNU General Public License and GNU Lesser General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>
------------------------------------------------------------------------------------------*/

//==============================================================================
// The sound model base class that all models use as a prototype
//==============================================================================
define(
	["jsaSound/jsaCore/config","jsaSound/jsaCore/utils", "jsaSound/scripts/recorderjs/recorder",  "jsaSound/jsaCore/jsasteller"],
	function (config, utils) { // dont actually use this "steller" variable, but rather the global name space setup in jsasteller.
		return function (i_node, i_inputs, i_outputs) {
			var that=this;
			var aboutText = "";
			var params = {};
			var paramname = []; // array of parameter names

			var sched;

			var pSets=[];
			var pSet={};

			var fs; // file system for saving and loading psets


			(function () {
				if (! i_outputs) {
					console.log("Consider providing an output node so model can be composed with other models");
				};

				if (org.anclab.steller.hasOwnProperty("sched")){
					sched = org.anclab.steller.sched;
				}
				else {
					sched = org.anclab.steller.sched = new org.anclab.steller.Scheduler(config.audioContext);
					sched.running=true;
				}
			}());



			var bsmInterface = org.anclab.steller.GraphNode(i_node || {}, i_inputs || [], i_outputs || []);



			bsmInterface.getSched = function(){
				return sched;
			}


			bsmInterface.setAboutText = function (i_text){
				aboutText=i_text;
			};

			bsmInterface.getAboutText = function () { return aboutText;};

			// Parameters are not over-writable
			bsmInterface.registerParam = function (i_name, i_type, i_val, i_f) {
				if (params.hasOwnProperty(i_name)) {
					console.log("Can not register 2 parameters with the same name");
					return;
				}
				var paramObject = {
					"type": i_type,
					"value": i_val,
					"f": i_f
				};
				//i_f(i_val); // initializization
				params[i_name] = paramObject;
				paramname.push(i_name);
			};

			// So a sound can directly expose a parameter of a child sound
			bsmInterface.registerChildParam = function (childModel, childPname, parentPname){
				var parentPname=parentPname || childPname;
				params[parentPname] = childModel.system.getRawParamObject(childPname);
				paramname.push(parentPname);
			};

			bsmInterface.getNumParams = function(){
				return paramname.length;
			};

			bsmInterface.getParamNames = function(){
				return paramname;
			};

			bsmInterface.getParamName = function (index) {
				if (index < paramname.length){
					return paramname[index];
				} else {
					return "";
				}
			};


			/*
			bsmInterface.getParams = function () {
				return params;
			};
			*/		

			bsmInterface.getParam = function(i_name, i_prop){
				i_name=testPName(i_name);
				var p = params[i_name];

				switch (i_prop){
					case "name":
						return i_name;
					case "type":
						return p.type;
					case "val":
						return p.value.val;
					case "normval":
						return (p.value.val - p.value.min)/(p.value.max - p.value.min);
					case "min":
						return p.value.min;
					case "max":
						return p.value.max;
					default:
						return null;
				}
			}


			bsmInterface.setParamNorm = function (i_name, i_val) {
				i_name=testPName(i_name);
				var p = params[i_name];
				p.value.val=p.value.min + i_val * (p.value.max - p.value.min);
				/*
				if (p.type==="discrete range") {
					p.value.val=parseInt(p.value.val);
				}
				*/
				p.f(p.value.val);
			};

			bsmInterface.setParam = function (i_name) {
				i_name=testPName(i_name);

				var args = [], i;
				for (i = 1; i < arguments.length; i += 1) {
					args.push(arguments[i]);
				}
				params[i_name].value.val=arguments[1];
				/*
				if (p.type==="discrete range") {
					p.value.val=arguments[1]=parseInt(p.value.val);
				}
				*/

				params[i_name].f.apply(this, args);
			};

			// All sound models need to have these methods
			bsmInterface.play = function () {
				console.log("baseSM.play() should probably be overridden ");
			};
			bsmInterface.release = function () {
				console.log("baseSM.release() should probably be overridden ");
			};
			bsmInterface.stop = function () {
				console.log("baseSM.stop() should probably be overridden ");
			};
			bsmInterface.destroy = function () {
				console.log("baseSM.destroy() should probably be overridden ");
			};

			bsmInterface.qrelease = function (ms) {
				if ((!ms) || ms === 0){
					bsmInterface.release();
				} else {
				setTimeout(bsmInterface.release,ms);
				}
			};


			// Takes parameter names or parameter indexes and checks for existence, return parameter string name
			var testPName = function (i_ind){

				if (utils.isInteger(i_ind)) {  // "overload" function to accept integer indexes in to parameter list, too.
					i_ind=bsmInterface.getParamNames()[i_ind];
				} 

				if (!params[i_ind]) {
					throw "set: Parameter " + o_name + " does not exist";
				}
				return i_ind;  // it has passed the existence test and been converted to the proper string name.
			}


			bsmInterface.storeCurrentPSet = function(){
				var pSet={};
				for(var i=0;i<bsmInterface.getNumParams();i++){
					pSet[bsmInterface.getParam(i,"name")] = bsmInterface.getParam(i,"val");
				}
				pSets.push(pSet);
			}



			bsmInterface.savePSets = function(){utils.saveToFile(pSets)};


			// vvvvvvvvvvvvvvvvvvvvvvvvvvvv   // intended for use only by jsaSound system
			bsmInterface.system={};
			bsmInterface.system.getRawParamObject=function(name){
				return params[name];
			}
			// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

			bsmInterface.registerParam(
				"play",
				//"discrete range",
				"range",
				{
					"min": 0,
					"max": 1.9999,
					"val": 0
				},
				function (i_val) {
					if (i_val>=1){
						bsmInterface.play();
					}
					else{
						bsmInterface.release();
					}
				}
			);

			//------------------  RECORDING  -------------------
			var isRecording=false;
			var audioRecorder=null;
			var recIndex=00;
			bsmInterface.startRecording = function (){
				if (audioRecorder===null){
					audioRecorder = new Recorder( bsmInterface );
				}
				audioRecorder.clear();
				audioRecorder.record();
				isRecording=true;
			}
			bsmInterface.stopRecording = function(){
				isRecording=false;
				audioRecorder.stop();
				audioRecorder.exportWAV( doneEncoding );
			}
			function doneEncoding( blob ) {
    			Recorder.forceDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
    			recIndex++;
			}


			return bsmInterface;
		};
	}
);