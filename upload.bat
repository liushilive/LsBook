rem python setup.py sdist upload
python setup.py sdist bdist_wheel

twine upload dist/*

pause