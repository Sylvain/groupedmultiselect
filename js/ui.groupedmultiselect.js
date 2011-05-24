/*
 * jQuery UI Grouped Multiselect
 *
 * Authors:
 * 	Sylvain Gautier (sylvain[at]imenlo[dot]com)
 *  Michael Aufreiter (quasipartikel.at)
 *  Yanick Rochon (yanick.rochon[at]gmail[dot]com)
 * 
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 * 
 * http://github.com/sylvain/groupedmultiselect
 *
 * 
 * Depends:
 *	ui.core.js
 *	ui.sortable.js
 *
 * Optional:
 * localization (http://plugins.jquery.com/project/localisation)
 * 
 * Todo:
 */


(function($) {

$.widget("ui.groupedmultiselect", {
  options: {
		searchable: true,
		doubleClickable: true,
		animated: 'fast',
		show: 'slideDown',
		hide: 'slideUp',
		dividerLocation: 0.5,
		nodeComparator: function(node1,node2) {
			var text1 = node1.text(),
			    text2 = node2.text();
			return text1 == text2 ? 0 : (text1 < text2 ? -1 : 1);
		}
	},
	_create: function() {
		this.element.hide();
		this.id = this.element.attr("id");
		this.container = $('<div class="ui-grouped-multiselect ui-helper-clearfix ui-widget"></div>').insertAfter(this.element);
		this.sectionContainer = $('<div class="sections"></div>').appendTo(this.container);
		this.itemContainer = $('<div class="items"></div>').appendTo(this.container);
		this.sectionActions = $('<div class="actions ui-widget-header ui-helper-clearfix"><span class="section-title">'+$.ui.groupedmultiselect.locale.sectionName+'</span></div>').appendTo(this.sectionContainer);
		this.itemActions = $('<div class="actions ui-widget-header ui-helper-clearfix"><input type="text" class="search empty ui-widget-content ui-corner-all"/><a href="#" class="remove-all">'+$.ui.groupedmultiselect.locale.removeAll+'</a><a href="#" class="add-all">'+$.ui.groupedmultiselect.locale.addAll+'</a></div>').appendTo(this.itemContainer);
		this.sectionList = $('<ul class="sections connected-list"><li class="ui-helper-hidden-accessible"></li></ul>').bind('selectstart', function(){return false;}).appendTo(this.sectionContainer);
		this.itemList = $('<ul class="items connected-list"><li class="ui-helper-hidden-accessible"></li></ul>').bind('selectstart', function(){return false;}).appendTo(this.itemContainer);
		
		var that = this;

		// set dimensions
		this.container.width(this.element.width()+1);
		this.sectionContainer.width(Math.floor(this.element.width()*this.options.dividerLocation));
		this.itemContainer.width(Math.floor(this.element.width()*(1-this.options.dividerLocation)));

		// fix list height to match <option> depending on their individual header's heights
		this.sectionList.height(Math.max(this.element.height()-this.sectionActions.height(),1));
		this.itemList.height(Math.max(this.element.height()-this.itemActions.height(),1));
		
		if ( !this.options.animated ) {
			this.options.show = 'show';
			this.options.hide = 'hide';
		}
		
		// init lists
		this._populateSectionList(this.element.find('optgroup'));
		this._populateItemList(this.element.find('optgroup').first().children());
		
		// set up livesearch
		if (this.options.searchable) {
			this._registerSearchEvents(this.itemContainer.find('input.search'));
		} else {
			$('.search').hide();
		}		
		
		// batch actions
		this.container.find(".remove-all").click(function() {
			return that._toggleItemList(false);
		});		
		
		this.container.find(".add-all").click(function() {
			return that._toggleItemList(true);
		});		
		
	},
	destroy: function() {
		this.element.show();
		this.container.remove();

		$.Widget.prototype.destroy.apply(this, arguments);
	},
	_populateItemList: function(options) {
		this.itemList.children('.ui-element').remove();

		var that = this;
		var items = $(options.map(function(i) {
	    var item = that._getOptionNode(this).appendTo(that.itemList).show();

			that._applyItemState(item, this.selected);
			item.data('idx', i);
			return item[0];
    }));
		
		that._filter.apply(this.itemContainer.find('input.search'), [that.itemList]);
  },
	_populateSectionList: function(groups) {
		this.sectionList.children('.ui-element').remove();

		var that = this;
		var items = $(groups.map(function(i) {
	    var item = that._getGroupNode(this).appendTo(that.sectionList).show();

			that._applySectionState(item, this.selected);
			item.data('idx', i);
			return item[0];
    }));
		
  },
	_getOptionNode: function(option) {
		option = $(option);
		var node = $('<li class="ui-state-default ui-element" title="'+option.text()+'"><label for="'+option.val()+'"><input type="checkbox" id="'+option.val()+'" value="'+option.val()+'"/><span>'+option.text()+'</span></label></li>').hide();
		node.data('optionLink', option);
		return node;
	},
	_getGroupNode: function(group) {
		group = $(group);
		var node = $('<li class="ui-state-default ui-element" title="'+group.attr("label")+'"><a href="#" class="action"><span class="ui-icon"/>'+group.attr("label")+'<span class="ui-corner-all ui-icon"/></a></li>').hide();
		node.data('optionLink', group);
		return node;
	},	
	// clones an item with associated data
	// didn't find a smarter away around this
	_cloneWithData: function(clonee) {
		var clone = clonee.clone(false,false);
		clone.data('optionLink', clonee.data('optionLink'));
		clone.data('idx', clonee.data('idx'));
		return clone;
	},
	_setSelected: function(item, selected) {
		item.data('optionLink').attr('selected', selected);

		if (selected) {
			var selectedItem = this._cloneWithData(item);
			this._applyItemState(selectedItem, true);
			return selectedItem;
		} else {	
			var availableItem = this._cloneWithData(item);		
			this._applyItemState(availableItem, false);
			return availableItem;
		}
	},
	_applyItemState: function(item, selected) {
		if (selected) {
			item.children('label').children('input').attr('checked', true)
		}
		this._registerChangeEvents(item.find('input'));		
		this._registerDoubleClickEvents(item);
		this._registerHoverEvents(item);
	},
	_applySectionState: function(section, selected) {

		section.children('span').removeClass('ui-icon-triangle-1-e').addClass('ui-helper-hidden').removeClass('ui-icon');
		section.find('a.action span').addClass('ui-icon-triangle-1-e');
		this._registerSelectEvents(section.find('a.action'));
		
		this._registerDoubleClickEvents(section);
		this._registerHoverEvents(section);
	},	
	_toggleItemList: function (toggle) {
		var that = this;
		var items = that.itemList.children('.ui-element');	
		if (items.length > 1) {
			items.each(function(i) {
				that._setSelected($(this), toggle);
				$(this).children('label').children('input').attr('checked', toggle);
			});
		} else {
			that._setSelected(items, toggle);
			items.children('label').children('input').attr('checked', toggle);				
		}

		return false;	
	},
	// taken from John Resig's liveUpdate script
	_filter: function(list) {
		var input = $(this);
		var rows = list.children('li'),
			cache = rows.map(function(){
				return $(this).text().toLowerCase();
			});
		
		var term = $.trim(input.val().toLowerCase()), scores = [];
		if (!term) {
			rows.show();
		} else {
			rows.hide();

			cache.each(function(i) {
				if (this.indexOf(term)>-1) { scores.push(i);}
			});

			$.each(scores, function() {
				$(rows[this]).show();
			});
		}
	},
	_registerDoubleClickEvents: function(elements) {
		if (!this.options.doubleClickable) return;
		elements.dblclick(function() {
			elements.find('a.action').click();
		});
	},
	_registerHoverEvents: function(elements) {
		elements.removeClass('ui-state-hover');
		elements.mouseover(function() {
			$(this).addClass('ui-state-hover');
		});
		elements.mouseout(function() {
			$(this).removeClass('ui-state-hover');
		});
	},
	_registerSelectEvents: function(elements) {
		var that = this;
		elements.click(function() {
			var options = that.element.find('optgroup[label="'+$(this).parent().attr('title')+'"]').first().children();
			var item = that._populateItemList(options);
			return false;
		});
	},	
	_registerChangeEvents: function(elements) {
		var that = this;
		elements.change(function() {
			var item = that._setSelected($(this).parent().parent(), $(this).is(':checked'));
			return false;
		});
	},
	_registerSearchEvents: function(input) {
		var that = this;

		input.focus(function() {
			$(this).addClass('ui-state-active');
		})
		.blur(function() {
			$(this).removeClass('ui-state-active');
		})
		.keypress(function(e) {
			if (e.keyCode == 13)
				return false;
		})
		.keyup(function() {
			that._filter.apply(this, [that.itemList]);
		});
	}	

});
		
$.extend($.ui.groupedmultiselect, {
	locale: {
		sectionName:'Sections', 
		addAll:'Add all',
		removeAll:'Remove all',
		itemsCount:'items selected'
	}
});


})(jQuery);
