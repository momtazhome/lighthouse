"use strict";require("../base/base.js");'use strict';global.tr.exportTo('tr.model',function(){function VMRegion(startAddress,sizeInBytes,protectionFlags,mappedFile,byteStats){this.startAddress=startAddress;this.sizeInBytes=sizeInBytes;this.protectionFlags=protectionFlags;this.mappedFile=mappedFile||'';this.byteStats=byteStats||{};};VMRegion.PROTECTION_FLAG_READ=4;VMRegion.PROTECTION_FLAG_WRITE=2;VMRegion.PROTECTION_FLAG_EXECUTE=1;VMRegion.PROTECTION_FLAG_MAYSHARE=128;VMRegion.prototype={get uniqueIdWithinProcess(){return this.mappedFile+'#'+this.startAddress;},get protectionFlagsToString(){if(this.protectionFlags===undefined)return undefined;return(this.protectionFlags&VMRegion.PROTECTION_FLAG_READ?'r':'-')+(this.protectionFlags&VMRegion.PROTECTION_FLAG_WRITE?'w':'-')+(this.protectionFlags&VMRegion.PROTECTION_FLAG_EXECUTE?'x':'-')+(this.protectionFlags&VMRegion.PROTECTION_FLAG_MAYSHARE?'s':'p');}};VMRegion.fromDict=function(dict){return new VMRegion(dict.startAddress,dict.sizeInBytes,dict.protectionFlags,dict.mappedFile,dict.byteStats);};function VMRegionClassificationNode(opt_rule){this.rule_=opt_rule||VMRegionClassificationNode.CLASSIFICATION_RULES;this.hasRegions=false;this.sizeInBytes=undefined;this.byteStats={};this.children_=undefined;this.regions_=[];}VMRegionClassificationNode.CLASSIFICATION_RULES={name:'Total',children:[{name:'Android',file:/^\/dev\/ashmem(?!\/libc malloc)/,children:[{name:'Java runtime',file:/^\/dev\/ashmem\/dalvik-/,children:[{name:'Spaces',file:/\/dalvik-(alloc|main|large object|non moving|zygote) space/,children:[{name:'Normal',file:/\/dalvik-(alloc|main)/},{name:'Large',file:/\/dalvik-large object/},{name:'Zygote',file:/\/dalvik-zygote/},{name:'Non-moving',file:/\/dalvik-non moving/}]},{name:'Linear Alloc',file:/\/dalvik-LinearAlloc/},{name:'Indirect Reference Table',file:/\/dalvik-indirect.ref/},{name:'Cache',file:/\/dalvik-jit-code-cache/},{name:'Accounting'}]},{name:'Cursor',file:/\/CursorWindow/},{name:'Ashmem'}]},{name:'Native heap',file:/^((\[heap\])|(\[anon:)|(\/dev\/ashmem\/libc malloc)|(\[discounted tracing overhead\])|$)/},{name:'Stack',file:/^\[stack/},{name:'Files',file:/\.((((jar)|(apk)|(ttf)|(odex)|(oat)|(art))$)|(dex)|(so))/,children:[{name:'so',file:/\.so/},{name:'jar',file:/\.jar$/},{name:'apk',file:/\.apk$/},{name:'ttf',file:/\.ttf$/},{name:'dex',file:/\.((dex)|(odex$))/},{name:'oat',file:/\.oat$/},{name:'art',file:/\.art$/}]},{name:'Devices',file:/(^\/dev\/)|(anon_inode:dmabuf)/,children:[{name:'GPU',file:/\/((nv)|(mali)|(kgsl))/},{name:'DMA',file:/anon_inode:dmabuf/}]}]};VMRegionClassificationNode.OTHER_RULE={name:'Other'};VMRegionClassificationNode.fromRegions=function(regions,opt_rules){var tree=new VMRegionClassificationNode(opt_rules);tree.regions_=regions;for(var i=0;i<regions.length;i++)tree.addStatsFromRegion_(regions[i]);return tree;};VMRegionClassificationNode.prototype={get title(){return this.rule_.name;},get children(){if(this.isLeafNode)return undefined;if(this.children_===undefined)this.buildTree_();return this.children_;},get regions(){if(!this.isLeafNode){return undefined;}return this.regions_;},get allRegionsForTesting(){if(this.regions_!==undefined){if(this.children_!==undefined){throw new Error('Internal error: a VM region classification node '+'cannot have both regions and children');}return this.regions_;}var regions=[];this.children_.forEach(function(childNode){regions=regions.concat(childNode.allRegionsForTesting);});return regions;},get isLeafNode(){var children=this.rule_.children;return children===undefined||children.length===0;},addRegion:function(region){this.addRegionRecursively_(region,true);},someRegion:function(fn,opt_this){if(this.regions_!==undefined){return this.regions_.some(fn,opt_this);}return this.children_.some(function(childNode){return childNode.someRegion(fn,opt_this);});},addRegionRecursively_:function(region,addStatsToThisNode){if(addStatsToThisNode)this.addStatsFromRegion_(region);if(this.regions_!==undefined){if(this.children_!==undefined){throw new Error('Internal error: a VM region classification node '+'cannot have both regions and children');}this.regions_.push(region);return;}function regionRowMatchesChildNide(child){var fileRegExp=child.rule_.file;if(fileRegExp===undefined)return true;return fileRegExp.test(region.mappedFile);}var matchedChild=tr.b.findFirstInArray(this.children_,regionRowMatchesChildNide);if(matchedChild===undefined){if(this.children_.length!==this.rule_.children.length)throw new Error('Internal error');matchedChild=new VMRegionClassificationNode(VMRegionClassificationNode.OTHER_RULE);this.children_.push(matchedChild);}matchedChild.addRegionRecursively_(region,true);},buildTree_:function(){var cachedRegions=this.regions_;this.regions_=undefined;this.buildChildNodesRecursively_();for(var i=0;i<cachedRegions.length;i++){this.addRegionRecursively_(cachedRegions[i],false);}},buildChildNodesRecursively_:function(){if(this.children_!==undefined){throw new Error('Internal error: Classification node already has children');}if(this.regions_!==undefined&&this.regions_.length!==0){throw new Error('Internal error: Classification node should have no regions');}if(this.isLeafNode)return;this.regions_=undefined;this.children_=this.rule_.children.map(function(childRule){var child=new VMRegionClassificationNode(childRule);child.buildChildNodesRecursively_();return child;});},addStatsFromRegion_:function(region){this.hasRegions=true;var regionSizeInBytes=region.sizeInBytes;if(regionSizeInBytes!==undefined)this.sizeInBytes=(this.sizeInBytes||0)+regionSizeInBytes;var thisByteStats=this.byteStats;var regionByteStats=region.byteStats;for(var byteStatName in regionByteStats){var regionByteStatValue=regionByteStats[byteStatName];if(regionByteStatValue===undefined)continue;thisByteStats[byteStatName]=(thisByteStats[byteStatName]||0)+regionByteStatValue;}}};return{VMRegion:VMRegion,VMRegionClassificationNode:VMRegionClassificationNode};});