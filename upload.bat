rem python setup.py sdist upload
python setup.py sdist bdist_wheel

twine upload dist/* --verbose

pause

rmdir /S /Q build
rmdir /S /Q dist
rmdir /S /Q LsBook.egg-info

