#!/bin/sh

echo "This is an automated merge script, only use it if you are aware how the usual uBlock -> AdNauseam mrege workflow works."
read -p "Are you sure you want to continue?" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then  
  VERSION=$1
  BRANCH=${2:-master}
  echo "Merging to AdNauseam $VERSION on branch $BRANCH"
  if [[ -z $(git status -s) ]]
  then
    echo "Merging to uBlock $VERSION"
    git fetch --all --tags --prune
    git checkout tags/$VERSION
    git checkout -b upstream$VERSION
    git checkout "$BRANCH"
    git checkout -b merge$VERSION
    git merge upstream$VERSION
  else
    echo "There are uncommited changes, make sure you commit them before starting your merge"
  fi
fi
