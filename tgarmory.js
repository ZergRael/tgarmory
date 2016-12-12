var ext = {
  DEBUG: true,
  cache: {},
  location: null,
  url: {
    STATIC: 'https://static.thetabx.net/',
    API: 'https://api.thetabx.net/tgc/3/',
  },

  tt: {
    showing: false,
    hovering: false,
    isOriginalTooltip: false,
    $tt: false,
    x: 0,
    y: 0,
    show: function(data) {
      this.$tt.html(data).show(10, this.onMove.bind(this));
      this.onMove();
    },

    hide: function() {
      this.showing = false;
      this.hovering = false;
      this.$tt.hide().html('');
    },

    prepare: function() {
      this.$tt = $('<div>', {
        id: 'w_tooltip',
        style: 'position: absolute; z-index:2000;'
      }).hide();
      $('body').prepend(this.$tt);
      $(document).mousemove(this.onMove.bind(this));
    },

    onMove: function(e) {
      if (e && e.pageX) {
        this.x = e.pageX + 11;
        this.y = e.pageY + 15;
      }
      if (this.showing) {
        var windowScrollTop = (document.body.scrollTop || document.documentElement.scrollTop);
        var height = this.$tt.height();
        if (this.y + height + 4 > windowScrollTop + window.innerHeight) {
          this.y = (windowScrollTop + window.innerHeight) - height - 4;
        }
      }
      if (this.hovering) {
        this.$tt.offset({
          left: this.x,
          top: this.y
        });
      }
    },
  },

  chars: {
    appendSearch: function(data) {
      var $tr = $('table[style="padding:0px; margin:0px;width:850px;"] tr:nth(1) table tr');
      if ($tr.length === 0 || data.results.length === 0) {
        return;
      }
      if ($tr.length == 1) {
        $header = $('<tr>').append([
            $('<td>', {style: 'width:300px;', align: 'center', text: 'Nom'}),
            $('<td>', {style: 'width:50px;', align: 'center', text: 'Niveau'}),
            $('<td>', {style: 'width:50px;', align: 'center', text: 'Rang'}),
            $('<td>', {style: 'width:50px;', align: 'center', text: 'Race'}),
            $('<td>', {style: 'width:50px;', align: 'center', text: 'Classe'}),
            $('<td>', {style: 'width:50px;', align: 'center', text: 'Faction'}),
            $('<td>', {style: 'width:300px;', align: 'center', text: 'Guilde'}),
          ]);
        $tr.before($header);
      }
      //var $tr = $('table[style="padding:0px; margin:0px;width:850px;"] tr:nth(1) table tr');
      //console.log($tr);
      //console.log(data);
    }
  },

  char: {
    refactorItemTooltips: function() {
      var enchantItemRegex = /<span style=\\"color:#0C0;\\">(?!Equipé|Utilisé|Chance)([^<]+)/;
      var slot = 0;
      $('td[onmouseover], td[style^="width:32px;;"]').each(function() {
        var $this = $(this);
        // Fix the horizontal and vertical padding on bottom tr
        if (slot == 16) {
          $this.css('padding-left', '5px');
        }
        // Extract tooltip
        if ($this.attr('onmouseover')) {
          var item = {
            id: Number($this.children('a').first().attr('href').match(/\d+/)[0]),
            slot: slot,
            mouseover: $this.attr('onmouseover')
          };
          item.hash = 'i' + item.id + '_' + item.slot;
          item.url = {
            item: item.id,
            tooltip: 1
          };

          if (item.mouseover) {
            var enchMatch = enchantItemRegex.exec(item.mouseover);
            // Extract enchant string and sand it to incorporate enchant in tooltip
            if (enchMatch) {
              item.url.slot = slot;
              item.url.enchstr = encodeURIComponent($.trim(enchMatch[1]));
            }
            // Keep original tooltip for ctrl comparison
            item.originalTooltip = item.mouseover.substring(8, item.mouseover.length - 3).replace(/\\"/g, '"');
            $this.removeAttr('onmouseover').removeAttr('onmouseout').children('a').attr('data_slot', slot);
          }
          ext.cache[item.hash] = item;
        }
        slot++;
      }).parent().each(function() {
        // Rewrite tr html to force inline onmouseover erase, removeAttr is not enough
        $(this).html($(this).html());
      });

      $(document).on('keydown keyup', function(e) {
        // CTRL key
        if (e.which != 17) {
          return;
        }
        // Toggle between new and original tooltip
        if (e.type == 'keydown') {
          if (ext.tt.showing && !ext.tt.isOriginalTooltip && ext.cache[ext.tt.showing].originalTooltip) {
            ext.tt.isOriginalTooltip = true;
            ext.tt.show(ext.cache[ext.tt.showing].originalTooltip);
          }
        } else if (e.type == 'keyup') {
          ext.tt.isOriginalTooltip = false;
          if (ext.tt.showing) {
            ext.tt.show(ext.cache[ext.tt.showing].cache);
          }
        }
      });
    },

    gemsTooltips: function(gear) {
      var slots = [
        'head', 'neck', 'shoulder', 'back', 'chest', 'shirt', 'tabard', 'wrist', 'hands', 'waist',
        'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'mainHand', 'offHand', 'ranged'
      ];
      for (var slot in gear) {
        if (!gear[slot]) {
          continue;
        }
        var numSlot = slots.indexOf(slot);
        var itemHash = 'i' + gear[slot].itemId + '_' + numSlot;
        if (ext.cache[itemHash] && ext.cache[itemHash].slot == numSlot && gear[slot].gems && gear[slot].gems.length) {
          ext.cache[itemHash].cache = null;
          ext.cache[itemHash].url.gems = gear[slot].gems.join(':');
        }
      }
    },

    // Add character avatar if missing
    fixAvatarAndPreview: function() {
      var $avatar = $('td[style^="height:82"]');
      if ($avatar.length) {
        var avatarId = $avatar.attr('style').match(/(\d+)-(\d+)-(\d+)/);
        if (avatarId && avatarId[2] > 9) {
          $avatar.attr('style', $avatar.attr('style').replace(/img\/armory_icons\/avatars\/\d+-\d+-\d+\.gif/,
            'https://static.thetabx.net/images/wow/armory/avatars/' + avatarId[1] + '-' + avatarId[2] + '-' +
            avatarId[3] + '.gif'));
        }
      }

      var $wh = $('#wowhead');
      if ($wh.length) {
        $wh.parents('td[style]').css('height', '346px');

        if ($wh.attr('data').indexOf('http://') != -1) {
          var $whVars = $wh.find('param[name="flashvars"]');
          if ($whVars.length) {
            $whVars.attr('value', $whVars.attr('value').replace('http://', 'https://'));
          }
          var $whMovie = $wh.find('param[name="movie"]');
          if ($whMovie.length) {
            $whMovie.attr('value', $whMovie.attr('value').replace('http://', 'https://'));
          }
          $wh.attr('data', $wh.attr('data').replace('http://', 'https://'));
        }
      }
    },

    // Try to correct talent trees
    fixTalents: function() { // (talents) {
      var level = Number($('span[style^="color:#fcd20c;"]').text().match(/\d+/));
      var talents = {
        total: 0,
        perTree: [0, 0, 0],
        perRow: [
          [],
          [],
          []
        ],
        trees: [
          [],
          [],
          []
        ]
      };
      if (!level || level < 70) {
        return;
      }
      var $trees = $('table.cursor>tbody>tr>td>center>table:nth-child(3n+2)');

      // Discover trees and fix internal errors
      $trees.each(function(treeN) {
        if ($(this).find('tr').length === 0) {
          return;
        }
        $(this).find('tr').each(function(rowN) {
          if ($(this).find('td').length === 0) {
            return;
          }
          var rowPoints = 0;
          $(this).find('td.cursor').each(function() {
            var actualPoints = $(this).find('strong').first().text().match(/(\d)\/(\d)/);
            var p = Number(actualPoints[1]);
            var mP = Number(actualPoints[2]);
            rowPoints += p;
            if (!talents.trees[treeN][rowN]) {
              talents.trees[treeN][rowN] = [];
            }
            talents.trees[treeN][rowN].push({
              p: p,
              mP: mP,
              node: $(this).find('strong').first()
            });
          });
          if (rowPoints > 0 && rowN > 0 && (1.0 * talents.perTree[treeN] / rowN) < 5.0) {
            var fixedTree = false;
            for (var row = rowN - 1; row >= 0; row--) {
              for (var i = 0; i < talents.trees[treeN][row].length; i++) {
                var t = talents.trees[treeN][row][i];
                if (t.mP == 1 && t.p === 0) {
                  t.p = 1;
                  t.node.text(t.p + '/' + t.mP);
                  talents.total += t.p;
                  talents.perTree[treeN] += t.p;
                  talents.perRow[treeN][row] += t.p;
                  fixedTree = true;
                  break;
                }
              }
              if (fixedTree) {
                break;
              }
            }
          }
          talents.total += rowPoints;
          talents.perTree[treeN] += rowPoints;
          talents.perRow[treeN].push(rowPoints);
        });
      });

      // Try to add 41st talent point. If there's more than 1 point missing, we can't just assume the 41st is really missing.
      if (talents.total == level - 10) {
        for (var treeN = 0; treeN < talents.trees.length; treeN++) {
          if (talents.perTree[treeN] >= 40) {
            talents.total += 1;
            talents.perTree[treeN] += 1;
            talents.perRow[treeN][talents.perRow[treeN].length - 1] += 1;
            var talent = talents.trees[treeN][talents.trees[treeN].length - 1][0];
            talent.p = 1;
            talent.node.text('1/1');
            break;
          }
        }
      }

      // If talents seems ok, let's correct colors
      if (talents.total == level - 9) {
        for (var treeM = 0; treeM < talents.trees.length; treeM++) {
          for (var rowN = 0; rowN < talents.trees[treeM].length; rowN++) {
            for (var colN = 0; colN < talents.trees[treeM][rowN].length; colN++) {
              if (talents.trees[treeM][rowN][colN].p === 0) {
                talents.trees[treeM][rowN][colN].node.css('color', '#999');
              } else {
                talents.trees[treeM][rowN][colN].node.css('color', '#FC0');
              }
            }
          }
        }
      }

      // Finish with column bottom text correction
      $('table.cursor>tbody>tr>td>center>table:nth-child(3n)').each(function(treeN) {
        $(this).find('span').first().text(talents.perTree[treeN]);
      });
    },

    // Buttload of updates on character
    appendUpdates: function(data) {
      var htmlContent = '';
      // Missing enchant locales
      var slotTranslate = {
        head: 'Tête',
        shoulder: 'Épaules',
        back: 'Dos',
        chest: 'Torse',
        wrist: 'Poignets',
        hands: 'Mains',
        legs: 'Jambes',
        feet: 'Pieds',
        mainHand: 'Arme',
        offHand: 'Main gauche',
        ranged: 'À distance'
      };
      // Specs locales
      var specs = {
        1: ['Armes', 'Fureur', 'Protection'],
        2: ['Sacré', 'Protection', 'Vindicte'],
        3: ['Maîtrise des bêtes', 'Précision', 'Survie'],
        4: ['Assassinat', 'Combat', 'Finesse'],
        5: ['Discipline', 'Sacré', 'Ombre'],
        7: ['Elémentaire', 'Amélioration', 'Restauration'],
        8: ['Arcane', 'Feu', 'Givre'],
        9: ['Affliction', 'Démonologie', 'Destruction'],
        11: ['Equilibre', 'Combat farouche', 'Restauration']
      };
      htmlContent += '<div class="tga_guildupdates">';
      if (data.guildUpdates.length > 0) {
        var lastGuild = false;
        for (var iGuild = 0; iGuild < data.guildUpdates.length; iGuild++) {
          var elGuild = data.guildUpdates[iGuild];
          if (elGuild.state == 'joined') {
            if (lastGuild) {
              // Append name to last left guild and break;
              lastGuild.guildName = elGuild.guildName;
            } else {
              lastGuild = elGuild;
            }
            break;
          }
          if (elGuild.state == 'left') {
            // Api sends only left event without guildName
            // Keep track of data until we find last joined guild
            lastGuild = elGuild;
          }
        }
        if (lastGuild && lastGuild.timestamp) {
          htmlContent += 'A ' + (lastGuild.state == 'left' ? 'quitté' : 'rejoint') + ' &lt;' + lastGuild.guildName +
            '&gt; le ' + ext.utils.dateToString(new Date(lastGuild.timestamp * 1000)); // Firefox doesn't understand ruby Date.to_string, let's fallback on timestamp * 1000
        } else {
          htmlContent += 'Pas de changement de guilde récent';
        }
      } else {
        htmlContent += 'Pas de changement de guilde récent';
      }
      htmlContent += '</div><br />';
      // Average item level, no more
      if (data.averageItemLevel) {
        htmlContent += '<div class="tga_averageilvl">Niveau d\'objet moyen : ' + data.averageItemLevel +
          '</div><br />';
      }
      htmlContent += '<div class="tga_missingenchants">';
      // Missing enchants with proper locales
      if (data.missingEnchants && data.missingEnchants.length > 0) {
        var missingEnchants = [];
        for (var iEnch = 0; iEnch < data.missingEnchants.length; iEnch++) {
          var elEnch = data.missingEnchants[iEnch];
          missingEnchants.push('<a href="index.php?box=armory&item=' + data.items[elEnch].itemId + '">' +
            slotTranslate[elEnch] + '</a>');
        }
        htmlContent += 'Enchantements manquants :<br />' + missingEnchants.join(', ');
      } else {
        htmlContent += 'Pas d\'enchantements manquants';
      }
      htmlContent += '</div><br /><div class="tga_gems">';
      // Gems sockets. &nbsp; is required for the last span to display ?!
      if (data.gems && data.gems.sumSockets > 0) {
        htmlContent += 'Châsses : ';
        for (var color in data.gems.sockets) {
          htmlContent += data.gems.sockets[color] + ' <span class="socket-' + color + '"></span>';
        }
        htmlContent += '&nbsp;';
      } else {
        htmlContent += 'Pas de châsses de gemmes';
      }
      htmlContent += '</div><br />';
      // Spec summary with proper locale
      if (data.talents.text) {
        htmlContent += '<div class="tga_spec"><a href="' + data.talents.url + '">Spécialisation (' + data.talents.text +
          ')</a>';
        if (data.talents.dominantTree !== null) {
          htmlContent += ' orientée <i>' + specs[data.class][data.talents.dominantTree] + '</i>';
        }
        htmlContent += '</div><br />';
      }
      // Honor
      if (data.honor) {
        var spanSide = data.side == 2 ? 'honorally_currency' : 'honorhorde_currency';
        htmlContent += '<div class="tga_honor">JcJ : ' + data.honor.todayKills + ' / <span class="' + spanSide +
          '">' +
          data.honor.todayHonor + '</span> - Hier : ' + data.honor.yesterdayKills + ' / <span class="' + spanSide +
          '">' +
          data.honor.yesterdayHonor + '</span>' + ' - A vie : ' + data.honor.totalKills + '</div>';
      }

      // append() in case block has data (never seen it)
      $('table[style^="width:344px;height:190px;background-image:url(img/armory_stats.jpg)"] td:last').first()
        .append(htmlContent).css({
          'text-align': 'left',
          'padding': '12px',
          'padding-left': '15px',
          'vertical-align': 'top',
          'line-height': '1.1em'
        });
    },

    // Last gear pieces equipped list
    appendGearUpdates: function(gearUpdates) {
      var htmlContent = '<span class="tga_header">Derniers loots (niveau d\'objet supérieur à 114) :</span><br />';
      if (gearUpdates.length > 0) {
        htmlContent += gearUpdates.map(function(el, index) {
          if (index < 6) { // Hard limit to 6 items. Should be enough for most cases
            return '<a href="index.php?box=armory&item=' + el.itemId + '"><img src="' + ext.url.STATIC +
              'images/wow/icons/small/' + el.icon.toLowerCase() + '.jpg" width="18" height="18" /> ' + el.name +
              '</a> (' + ext.utils.dateToString(new Date(el.timestamp * 1000)) + ')<br />';
          }
        }).join('');
      } else {
        htmlContent += 'Pas de loots récents<br />';
      }
      // replace <br />, less waste of room
      $('table.cursor').parent().children('br').first().replaceWith('<div id="gear_updates" class="tga_block">' +
        ext.utils.buildFrame('gear_updates', htmlContent) + '</div>');
    },

    // team.members to html table row
    teamToMembersHtml: function(team) {
      return $.map(team.members, function(e) {
        return '<tr><td><a href="/index.php?box=armory&character=' + e.id + '">' + e.name +
          '</a></td><td class="arena_rating">' + e.rating + '</td><td><span class="arena_wins">' + e.wins +
          '</span> - <span class="arena_loses">' + e.loses + '</span></td><td><span class="arena_percent">(' +
          e.percent + '%)</span></td></tr>';
      }).join('');
    },

    // Arena teams if available
    appendArena: function(data) {
      if (data.length === 0) {
        return;
      }
      var brackets = [2, 3, 5];
      var htmlContent = '';
      var displayedTeams = 0;
      for (var i = 0; i < brackets.length; i++) {
        var team = data[brackets[i]];
        if (!team) {
          continue;
        }
        displayedTeams++;
        htmlContent += '<div class="tga_bracket">' + ext.utils.buildFrame('arena_teams',
          '<div class="arena_bracket"><a href="/index.php?box=pvp&type=' + brackets[i] + '">' + brackets[i] + 'v' +
          brackets[i] + '</a></div>' + team.name + ' <a class="arena_position" href="/index.php?box=armory&team=' +
          team.id +
          '">#' + team.position +
          '</a><br /><table><tbody><tr><td>Equipe</td><td class="arena_rating team_rating">' +
          team.rating + '</td><td><span class="arena_wins">' + team.wins + '</span> - <span class="arena_loses">' +
          team.loses +
          '</span></td></tr>' + ext.char.teamToMembersHtml(team) + '</tbody></table>') + '</div>';
      }
      if (htmlContent.length > 0) {
        $('table.cursor').parent().children('br').first().replaceWith('<div id="arena_teams" class="tga_block">' +
          htmlContent + '</div>');
      }
      // If there's only one bracket to display, try to inline it with the gearUpdates frame
      if (displayedTeams == 1) {
        $('.tga_block').css('display', 'inline-block');
      }
    },
  },

  global: {
    appendTooltips: function() {
      $(document).on('mouseenter mouseleave', 'a[href*=spell\\=], a[href*=item\\=], a[href*=npc\\=]', function(e) {
        if (e.type == 'mouseenter') {
          var objMatch = $(this).attr('href').match(/(item|spell|npc)=(\d+)/);
          if (!objMatch) {
            return;
          }
          var prefix = objMatch[1].substr(0, 1);
          var objId = objMatch[2];
          var slot = $(this).attr('data_slot');
          var hash = prefix + objId + (slot ? '_' + slot : '');
          var obj = ext.cache[hash];
          ext.tt.hovering = hash;
          if (obj && obj.cache) {
            ext.tt.showing = obj.hash;
            if (ext.tt.isOriginalTooltip && obj.originalTooltip) {
              ext.tt.show(obj.originalTooltip);
            } else {
              ext.tt.show(obj.cache);
            }
          } else {
            if (!obj) {
              obj = {
                id: objId,
                hash: hash,
                url: {}
              };
              obj.url[objMatch[1]] = objId;
              obj.url.tooltip = 1;
              ext.cache[obj.hash] = obj;
            }
            ext.utils.getData({
              data: obj.url
            }, function(data) {
              obj.cache = data;
              if (ext.tt.hovering == obj.hash) {
                ext.tt.showing = obj.hash;
                if (ext.tt.isOriginalTooltip && obj.originalTooltip) {
                  ext.tt.show(obj.originalTooltip);
                } else {
                  ext.tt.show(obj.cache);
                }
              }
            });
          }
        } else {
          ext.tt.hide();
        }
      });
    },

    buildGuildLinks: function() {
      var $guilds = $(
        'span[style="color:#fff; font-size:11px;"], td[style="padding-top:8px;padding-bottom:6px; font-size:9px; padding-left:4px;text-align:center"], p[style="font:0.9em Arial, sans-serif ; line-height:1em;color:;margin:0px; padding:0px;"], td[style=" width:200px;height:50px;font-size:22px; color:#b4e718;padding-top:26px;  vertical-align:top; font-family:frizquadratatt;"] strong, td[style="width:300px;"][align="center"].armory_search_header_td'
      );
      var guilds = {};

      if ($guilds.length === 0) {
        return;
      }

      $guilds.each(function() {
        var bName = $(this).text().trim();
        if (bName === '') {
          return;
        }
        var name = bName.indexOf('<') == -1 ? bName : bName.substring(1, bName.length - 1);
        if (ext.guild.invalidNames.indexOf(name) != -1) {
          return;
        }
        if (guilds[name]) {
          guilds[name].nodes.push($(this));
        } else {
          guilds[name] = {
            bName: bName,
            nodes: [$(this)]
          };
        }
      });

      var savedGuilds = ext.storage.get('guilds', {});
      var fetchTheses = [];

      for (var name in guilds) {
        if (!savedGuilds[name]) {
          guilds[name].fetch = true;
          fetchTheses.push(name);
        } else {
          guilds[name].id = savedGuilds[name];
        }
      }

      if (fetchTheses.length) {
        ext.utils.getData({
          url: 'search/guild',
          data: {
            q: fetchTheses
          }
        }, function(ajx) {
          if (ajx.status == 'success' && ajx.data.count > 0) {
            for (var i in ajx.data.results) {
              var g = ajx.data.results[i];
              if (guilds[g.name]) {
                guilds[g.name].id = g.id;
                savedGuilds[g.name] = g.id;
              }
            }
            ext.storage.set('guilds', savedGuilds);
          }
          ext.global.addGuildLinks(guilds);
        });
      } else {
        ext.global.addGuildLinks(guilds);
      }
    },

    addGuildLinks: function(guilds) {
      for (var name in guilds) {
        if (guilds[name].id) {
          for (var n in guilds[name].nodes) {
            guilds[name].nodes[n].wrapInner('<a href="/index.php?box=armory&guild=' + guilds[name].id + '">');
          }
        }
      }
    },
  },

  guild: {
    invalidNames: ['Assistant communautaire', 'Community Manager', 'MVP', 'Maître de jeu', 'Administrateur',
      'Pas-de-Personnage'
    ],

    buildPage: function() {
      $('table:nth(5) tr:nth(1) td').html($('<div>', {
        class: 'guild_page'
      }).append(
        $('<h1>', {
          text: 'Guilde'
        }),
        $(ext.utils.buildFrame('armory_frame', '')),
        $('<table>', {
          class: 'armory_table armory_guild_loots'
        }).append(
          $('<thead>').append(
            $('<tr>').append($('<td>', {
              colspan: 3,
              text: 'Derniers loots',
              class: 'head_col'
            })),
            $('<tr>').append(
              $('<td>', {
                class: 'large_col',
                text: 'Item'
              }),
              $('<td>', {
                class: 'small_col',
                text: 'Joueur'
              }),
              $('<td>', {
                class: 'small_col',
                text: 'Date'
              })
            )
          ),
          $('<tbody>')
        ),
        $('<table>', {
          class: 'armory_table armory_guild_downs'
        }).append(
          $('<thead>').append(
            $('<tr>').append($('<td>', {
              colspan: 2,
              text: 'Downs récents',
              class: 'head_col'
            })),
            $('<tr>').append(
              $('<td>', {
                class: 'med_col',
                text: 'Boss'
              }),
              $('<td>', {
                class: 'med_col',
                text: 'Date'
              })
            )
          ),
          $('<tbody>')
        ),
        $('<div>', {
          class: 'clearfloat'
        }),
        $('<table>', {
          class: 'armory_table armory_guild_chars'
        }).append(
          $('<thead>').append(
            $('<tr>').append($('<td>', {
              colspan: 6,
              text: 'Membres',
              class: 'head_col'
            })),
            $('<tr>').append(
              $('<td>', {
                class: 'med_col',
                text: 'Nom'
              }),
              $('<td>', {
                class: 'small_col',
                text: 'Niveau'
              }),
              $('<td>', {
                class: 'small_col',
                text: 'Race'
              }),
              $('<td>', {
                class: 'small_col',
                text: 'Classe'
              }),
              $('<td>', {
                class: 'small_col',
                text: 'Spec'
              }),
              $('<td>', {
                class: 'hmed_col',
                text: 'Dernière déconnexion'
              })
            )
          ),
          $('<tbody>')
        )
      ));
    },

    fillPage: function(guild) {
      var detailsHtml = [];
      var membersHtml = [];
      var lootsHtml = [];
      var bossHtml = [];
      var members = {};
      var UPDATES_LIMIT = 12;
      var TIME_TRESHOLD = 60 * 24 * 60 * 60 * 1000;
      var dateTreshold = new Date();
      dateTreshold.setTime(dateTreshold.getTime() - TIME_TRESHOLD);

      // Headers
      $('.guild_page h1').text(' ' + guild.name);
      if (guild.side) {
        $('.guild_page h1').addClass(guild.side == 1 ? 'logo_h' : 'logo_a');
      }

      // Frame contents
      if (guild.desc) {
        detailsHtml.push(guild.desc);
      }
      if (guild.url) {
        //detailsHtml.push($('<a>', {href: guild.url, text: guild.url}));
        detailsHtml.push('<a href="' + guild.url + '">' + guild.url + '</a>');
      }
      if (guild.displayedMembersCount) {
        //if (guild.url) {
        //  detailsHtml.push($('<br>'));
        //}
        //detailsHtml.push(guild.displayedMembersCount + ' membres');
        detailsHtml.push((detailsHtml.length ? '<br />' : '') + guild.displayedMembersCount + ' membres');
      }
      if (guild.progressText) {
        //detailsHtml.push($('<a>', {href: '/index.php?box=pve', text: 'Progression : ' + guild.progressText}));
        detailsHtml.push('<a href="/index.php?box=pve">Progression : ' + guild.progressText + '</a>');
      }
      if (guild.creationTimestamp) {
        detailsHtml.push('Guilde créée le ' + ext.utils.dateToString(new Date(guild.creationTimestamp * 1000)));
      }
      if (!detailsHtml.length) {
        detailsHtml.push(
          'Cette guilde n\'est actuellement pas présente dans le <a href="/index.php?box=pve">classement PVE</a>.<br /><br />Les informations de guilde ainsi que les derniers downs ne seront donc pas affichés.'
        );
      }
      $('.armory_frame .tga_frame_content').html(detailsHtml.join('<br />'));


      // Members
      for (var i in guild.members) {
        var member = guild.members[i];
        members[member.charId] = member.name;
        if (new Date(member.lastAct * 1000) < dateTreshold) {
          continue;
        }
        membersHtml.push($('<tr>').append(
          $('<td>', {
            class: 'med_col'
          }).append($('<a>', {
            href: '/index.php?box=armory&character=' + member.charId,
            text: member.name
          })),
          $('<td>', {
            class: 'small_col',
            text: member.level
          }),
          $('<td>', {
            class: 'small_col'
          }).append($('<img>', {
            src: 'img/race-' + member.race + '.gif'
          })),
          $('<td>', {
            class: 'small_col'
          }).append($('<img>', {
            src: 'img/class-' + member.class + '.gif'
          })),
          $('<td>', {
            class: 'small_col'
          }).append(member.spec !== null ? $('<img>', {
            src: ext.url.STATIC + 'images/wow/armory/spec/small/' + member.class + '-' + member.spec +
              '.jpg'
          }) : ''),
          $('<td>', {
            class: 'hmed_col centered',
            text: member.lastAct > 0 ? ext.utils.dateToString(new Date(member.lastAct * 1000), true) : ''
          })
        ));
      }
      membersHtml.push($('<tr>').append($('<td>', {
        colspan: 6,
        class: 'armoryfooter',
        text: membersHtml.length + ' personnages affichés (personnages actifs 60 derniers jours)'
      })));
      $('.armory_guild_chars tbody').append(membersHtml);

      // Loots
      for (var j in guild.gearUpdates) {
        var loot = guild.gearUpdates[j];
        lootsHtml.push($('<tr>').append(
          $('<td>', {
            class: 'large_col'
          }).append($('<a>', {
            href: '/index.php?box=armory&item=' + loot.itemId
          }).append($('<img>', {
            src: ext.url.STATIC + 'images/wow/icons/small/' + loot.icon.toLowerCase() + '.jpg',
            width: 18,
            height: 18
          }), ' ' + loot.name)),
          $('<td>', {
            class: 'small_col'
          }).append($('<a>', {
            href: '/index.php?box=armory&character=' + loot.char,
            text: members[loot.char]
          })),
          $('<td>', {
            class: 'small_col',
            text: ext.utils.dateToString(new Date(loot.timestamp * 1000))
          })
        ));
        if (lootsHtml.length >= UPDATES_LIMIT) {
          break;
        }
      }
      $('.armory_guild_loots tbody').append(lootsHtml);

      // Bosses
      for (var k in guild.recentDowns) {
        var boss = guild.recentDowns[k];
        bossHtml.push($('<tr>').append(
          $('<td>', {
            class: 'med_col',
            text: boss.name
          }),
          $('<td>', {
            class: 'med_col centered',
            text: ext.utils.dateToString(new Date(boss.timestamp * 1000), true)
          })
        ));
        if (bossHtml.length >= UPDATES_LIMIT) {
          break;
        }
      }
      $('.armory_guild_downs tbody').append(bossHtml);
    },

    init: function(guildId) {
      this.buildPage();
      ext.utils.getData({
        data: {
          guild: guildId
        }
      }, function(ajx) {
        if (ajx && ajx.status == 'success') {
          ext.guild.fillPage(ajx.data);
        }
      });
    },
  },

  init: function() {
    $('head').append(
      '<link rel="stylesheet" type="text/css" href="https://static.thetabx.net/css/wow/wowheadlike.css" />');
    $('#curseur').css('width', 'auto');
  },

  storage: {
    expire: {
      guilds: 30 * 24 * 60 * 60 * 1000,
    },
    opt: {},
    date: {},
    set: function(key, obj) {
      this.opt[key] = obj;
      this.date[key] = new Date().valueOf();
      this.save();
    },
    get: function(key, def) {
      if (this.opt[key] === undefined) {
        return def;
      }
      if (this.date[key] + this.expire[key] < new Date().valueOf()) {
        this.set(key, def);
        return def;
      }
      return this.opt[key];
    },
    load: function(callback) {
      chrome.storage.local.get('tga', function(o) {
        ext.storage.opt = o;
        callback();
      });
    },
    save: function() {
      chrome.storage.local.set({
        tga: this.opt
      });
    }
  },

  utils: {
    parseUrl: function(url) {
      var u = {
          p: {}
        },
        urlMatch = url.match(/(https?:\/\/[^\/]+)?(\/?[^\?]*)(\?.*)?/);
      if (!urlMatch) {
        return false;
      }
      u.host = urlMatch[1] || window.location.origin;
      u.path = urlMatch[2];
      u.search = urlMatch[3];

      if (!u.search) {
        return u;
      }
      var params = u.search.substring(1).split('&');
      for (var i in params) {
        var kv = params[i].split('=');
        if (kv.length != 2) {
          continue;
        }
        u.p[kv[0]] = kv[1];
      }
      return u;
    },

    getData: function(o, callback) {
      return $.ajax({
        url: ext.url.API + (o.url || ''),
        type: 'GET',
        data: o.data || {},
        cache: true,
        success: callback
      });
    },

    // Not beautiful, still needed. sprintf, where are you ?
    dateToString: function(date, full) {
      var str = [
        (date.getDate() < 10 ? '0' : '') + date.getDate(),
        (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1),
        date.getFullYear()
      ].join('/');
      if (full) {
        str += ' ' + [
          (date.getHours() < 10 ? '0' : '') + date.getHours(),
          (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
        ].join(':');
      }
      return str;
    },

    // Create a table with proper borders
    buildFrame: function(className, content) {
      return '<table class="tga_frame ' + className + '"><tbody><tr><td class="tga_frame_content">' + content +
        '</td><th style="background-position: top right;"></th></tr><tr><th style="background-position: bottom left;"></th><th style="background-position: bottom right;"></th></tr></tbody></table>';
    },
  },

  load: function() {
    this.storage.load(function() {
      ext.postDBRun();
    });
  },

  run: function() {
    if (window.location.host.indexOf('thegeekcrusade-serveur.com') > 4) {
      return;
    }

    var u = this.utils.parseUrl(window.location.href);
    if (!u || u.path == '/db/') {
      return;
    }

    ext.init();

    if (u.p.box && u.p.box == 'armory') {
      if (u.p.character) {
        if (u.p.character.length === 0 || isNaN(u.p.character)) {
          return;
        } // Char armory check
        if ($('table').length < 10) {
          this.utils.getData({
            data: {
              'char': u.p.character
            }
          });
          return;
        } // Probably error page
        this.location = 'char';
      } else if (u.p.guild) {
        if (u.p.guild.length === 0 || isNaN(u.p.guild)) {
          return;
        } // Guild armory check
        if ($('table').length > 10) {
          return;
        } // Probably real page
        this.location = 'guild';
      } else if (u.p.characters) {
        if (u.p.characters.length === 0) {
          return;
        }
        this.location = 'charsearch';
      }
    } else if (u.p.box && u.p.box == 'shopITE') {
      this.location = 'shop';
    } else {
      this.location = 'global';
    }

    this.tt.prepare();

    if (this.location == 'char') {
      this.utils.getData({
        data: {
          'char': u.p.character
        }
      }, function(ajx) {
        if (ajx.status == 'success') {
          var cData = ajx.data;
          ext.char.appendUpdates(cData);
          ext.char.appendGearUpdates(cData.gearUpdates);
          ext.char.appendArena(cData.arena);
          ext.char.fixTalents(cData.talents);
          ext.char.gemsTooltips(cData.items);
        }
      });
      ext.char.fixAvatarAndPreview();
      ext.char.refactorItemTooltips();
    }

    if (this.location == 'charsearch') {
      this.utils.getData({
        url: 'search/char',
        data: {
          'fuzzy': true,
          'q': u.p.characters,
        }
      }, function(ajx) {
        if (ajx.status == 'success') {
          ext.chars.appendSearch(ajx.data);
        }
      })
      
    }

    if (this.location == 'guild') {
      ext.guild.init(u.p.guild);
    }

    ext.global.appendTooltips();
  },

  postDBRun: function() {
    if (this.location != 'shop') {
      ext.global.buildGuildLinks();
    }
  },
}

ext.load();
ext.run();
