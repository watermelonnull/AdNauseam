#!/usr/bin/env bash
#
# This script assumes a linux environment
#


DES=${1-/tmp}
DIR=${2-_locales}

hash jq 2>/dev/null || { echo; echo >&2 "Error: this script requires jq (https://stedolan.github.io/jq/), but it's not installed"; exit 1; }

printf "*** Generating locale files in $DES... "

LANGS=(en zh_TW zh_CN de fr ru it pt_PT pt_BR es cs 'fi' lt pl sv nb ja ko uk bn hi)
# missing translations for new strings: tmp remove sk, el, 'id', sr 
# cs Czech, el Greek, id Indonesian, lt Lithuanian, pl Polish, sr Serbian(Cyrillic),sv Swedish

FILES=src/_locales/**/adnauseam.json
reference=src/_locales/en/adnauseam.json
refLength=`jq '. | length' $reference`
refDes=`jq 'map(.description)' $reference`
report=0
# echo "Languages:" ${LANGS[*]}

for adnfile in $FILES
do
  messages="${adnfile/adnauseam/messages}"
  out="${messages/src/$DES}"
  outfile=`echo $out | sed "s/_locales/${DIR}/"`
  dir=`dirname $outfile`
  out="${out/\/messages.json/}"
  lang=`basename $out`
  length=`jq '. | length' $adnfile`
  curDes=`jq 'map(.description)' $adnfile`
  # continue ONLY IF $lang is in LANGS
  if [[ " ${LANGS[@]} " =~ " $lang " ]]
  then
    mkdir -p $dir && touch $outfile
    #echo Writing $outfile

    #Notification when English locale has changes
    if [[ "$length" -ne "$refLength" || "$refDes" != "$curDes" ]]
       then
          [ "$report" -eq "0" ] && echo -e "\nThere are new changes in the English locale file. Please update the locale folder"
          let "report++"
    fi

    jq -s '.[0] * .[1]' $messages $adnfile > $outfile
    awk '{gsub(/uBlock₀/, "AdNauseam")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
    awk '{gsub(/uBlock Origin/, "AdNauseam")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
    awk '{gsub(/ublock/, "AdNauseam")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
    awk '{gsub(/uBlock\/wiki/, "AdNauseam/wiki")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
    awk '{gsub(/uBlockOrigin\/uBlock-issue/, "dhowe/AdNauseam")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
    awk '{gsub(/uBlockOrigin\/uAssets/, "dhowe/AdNauseam")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
    awk '{gsub(/#uBO#/, "uBlock Origin")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile # sometimes the name "uBlock Origin" is needed to be displayed in adnauseam application, this is a work-around
    awk '{gsub(/Ctrl+click/, "Alt+click")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
    awk '{gsub(/ ＋ /, " / ")}1' $outfile > /tmp/outfile && mv /tmp/outfile $outfile
  fi

done

#echo && ls -Rl $DES/*

echo "done."

#less /tmp/_locales/en/messages.json
